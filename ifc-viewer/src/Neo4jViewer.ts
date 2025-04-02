import * as d3 from "d3";
import { IFCViewer } from "./IFCViewer";
import { GraphData, Node, Link } from "./types";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Neo4jFilterPanel } from "./components/Neo4jFilterPanel";

const DARK_BLUE = "#63D8F2";
const BLUE = "#63D8F2";
const LIGHT_BLUE = "#63D8F2";
const ORANGE = "#FF9800";
const DARK_GREY = "#dcdcdc";
const GREY = "#666";
const LIGHT_GREY = "#f8f9fa";

const SERVER_BASE_URL = "http://localhost:3001";
const NODE_RADIUS = 30;
const NODE_COLOR = LIGHT_GREY;
const SELECTABLE_COLOR = DARK_GREY;
const SELECTED_COLOR = ORANGE;
const DISASSEMBLY_RELEVANT_COLOR = DARK_BLUE;
const STROKE_WIDTH = 1.5;
const MARKER_ID = "arrow";

export class Neo4jViewer {
  private container: HTMLElement;
  private svgElement: SVGSVGElement;
  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private propertiesPanel: PropertiesPanel;
  private filterPanel: Neo4jFilterPanel;
  private ifcViewer: IFCViewer | null = null;
  private currGraphData: GraphData | null = null;
  private selectedNode: Node | null = null;
  private dissassemblyRelevantGraphData: GraphData | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.container.appendChild(this.svgElement);
    this.propertiesPanel = new PropertiesPanel("neo4j-properties-panel");
    this.filterPanel = new Neo4jFilterPanel(this);
  }

  public setIfcViewer(ifcViewer: IFCViewer) {
    this.ifcViewer = ifcViewer;
  }

  public async loadGraph() {
    this.currGraphData = await this.fetchGraphData();
    this.filterPanel.updateFilters(new Map([]));
    this.createForceGraph();
  }

  public async loadSubgraph(nodeGuid: string) {
    if (this.selectedNode && this.selectedNode.properties.GUID === nodeGuid)
      return;
    this.currGraphData = await this.fetchGraphData(nodeGuid);
    this.filterPanel.updateFilters(
      new Map([["Only Disassembly Graph", false]])
    );
    this.setSelectedNode(nodeGuid);
    this.setDissassemblyRelevantGraphData();
    this.createForceGraph();
  }

  private getNodeId(node: string | { id: string }) {
    return typeof node === "string" ? node : node.id;
  }

  private async fetchGraphData(selectedNodeGuid: string | null = null) {
    try {
      const url = selectedNodeGuid
        ? `/api/graph?guid=${encodeURIComponent(selectedNodeGuid)}`
        : "/api/graph";

      const response = await fetch(`${SERVER_BASE_URL}${url}`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  }

  private setSelectedNode(nodeGuid: string) {
    this.selectedNode = this.currGraphData.nodes.find(
      (node) => node.properties.GUID === nodeGuid
    );
  }

  private setDissassemblyRelevantGraphData() {
    const allValidLinks = new Set<Link>(
      this.currGraphData.links.filter((link) => link.source && link.target)
    );

    const relevantLinks = new Set<Link>();
    const relevantNodeIds = new Set<string>([this.selectedNode.id]);

    for (const link of allValidLinks) {
      if (
        link.type === "matchedArchetype" &&
        this.getNodeId(link.source) === this.selectedNode.id
      ) {
        const targetId = this.getNodeId(link.target);
        relevantLinks.add(link);
        relevantNodeIds.add(targetId);
      }
    }

    let expanded = true;
    while (expanded) {
      expanded = false;

      for (const link of allValidLinks) {
        const sourceId = this.getNodeId(link.source);
        const targetId = this.getNodeId(link.target);

        if (
          sourceId !== this.selectedNode.id &&
          relevantNodeIds.has(sourceId) &&
          !relevantNodeIds.has(targetId)
        ) {
          relevantNodeIds.add(targetId);
          expanded = true;

          // Add all links connected to this new target node (excluding back to selectedNode)
          for (const l of allValidLinks) {
            const lSource = this.getNodeId(l.source);
            const lTarget = this.getNodeId(l.target);

            if (
              (lSource === targetId && lTarget !== this.selectedNode.id) ||
              (lTarget === targetId && lSource !== this.selectedNode.id)
            ) {
              relevantLinks.add(l);
            }
          }
        }
      }
    }

    const filteredNodes = this.currGraphData.nodes.filter((node) =>
      relevantNodeIds.has(node.id)
    );

    if (!filteredNodes.includes(this.selectedNode)) {
      filteredNodes.push(this.selectedNode);
    }

    this.dissassemblyRelevantGraphData = {
      nodes: filteredNodes,
      links: Array.from(relevantLinks),
    };
  }

  public toggleOnlyDisassemblyGraphFilter(shouldApply: boolean) {
    if (!this.currGraphData || !this.dissassemblyRelevantGraphData) return;

    const relevantNodeIds = new Set(
      this.dissassemblyRelevantGraphData.nodes.map((node) => node.id)
    );
    const relevantLinks = new Set(
      this.dissassemblyRelevantGraphData.links.map(
        (link) =>
          `${this.getNodeId(link.source)}-${this.getNodeId(link.target)}`
      )
    );

    d3.select(this.svgElement)
      .selectAll<SVGGElement, Node>("g.node-group > g.node")
      .style("display", (d: any) =>
        shouldApply ? (relevantNodeIds.has(d.id) ? null : "none") : null
      );

    d3.select(this.svgElement)
      .selectAll<SVGGElement, Link>("g.link-group > g.link")
      .style("display", (d: any) => {
        const sourceId = this.getNodeId(d.source);
        const targetId = this.getNodeId(d.target);
        const linkKey = `${sourceId}-${targetId}`;
        return shouldApply
          ? relevantLinks.has(linkKey)
            ? null
            : "none"
          : null;
      });
  }

  private createForceGraph() {
    this.resetZoom();

    const svg = this.setupSvgCanvas();
    const g = svg.append("g");
    this.setupZoom(svg, g);
    this.defineLinkArrow(svg);

    const simulation = this.setupSimulation(this.currGraphData);
    const linkPaths = this.drawLinkPaths(g, this.currGraphData.links);
    const nodeGroup = this.drawNodeGroup(
      g,
      this.currGraphData.nodes,
      simulation
    );
    simulation.on("tick", () => {
      this.updateGraphPositions(linkPaths, nodeGroup);
    });

    this.selectNode(this.selectedNode);
  }

  private setupSvgCanvas() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    const svg = d3
      .select(this.svgElement)
      .attr("width", width)
      .attr("height", height);

    svg.selectAll("*").remove();
    return svg;
  }

  private resetZoom() {
    if (this.zoomBehavior) {
      d3.select(this.svgElement)
        .transition()
        .duration(0)
        .call(this.zoomBehavior.transform, d3.zoomIdentity);
    }
  }

  private isLinkSelectable(d: Link) {
    return d.properties && Object.keys(d.properties).length > 0;
  }

  private defineLinkArrow(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  ) {
    const defs = svg.append("defs");

    // Marker for selectable links
    defs
      .append("marker")
      .attr("id", `${MARKER_ID}-selectable`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", NODE_RADIUS + 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", DISASSEMBLY_RELEVANT_COLOR);

    // Marker for non-selectable links
    defs
      .append("marker")
      .attr("id", `${MARKER_ID}-default`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", NODE_RADIUS + 10)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", GREY);
  }

  private setupZoom(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    g: d3.Selection<SVGGElement, unknown, null, undefined>
  ) {
    this.zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));

    svg.call(this.zoomBehavior);
  }

  private setupSimulation(data: GraphData) {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    return d3
      .forceSimulation<Node>(data.nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(data.links)
          .id((d) => d.id)
          .distance(180)
          .strength(0.7)
      )
      .force("charge", d3.forceManyBody().strength(-450))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(NODE_RADIUS * 2.2))
      .alpha(1)
      .alphaDecay(0.025)
      .alphaMin(0.001)
      .velocityDecay(0.35);
  }

  private drawLinkPaths(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    links: Link[]
  ) {
    const linkGroup = g
      .append("g")
      .attr("class", "link-group")
      .selectAll("g")
      .data(links)
      .enter()
      .append("g")
      .attr("class", "link")
      .on("click", (event, d) => {
        event.stopPropagation();
        if (isLinkSelectable(d)) {
          this.propertiesPanel.displayElementProperties({
            elementInfo: d.properties || {},
          });
        }
      })
      .on("mouseover", function (event, d) {
        if (isLinkSelectable(d)) {
          d3.select(this).style("cursor", "pointer");
        }
      })
      .on("mouseout", function (event, d) {
        d3.select(this).style("cursor", "default");
      });

    const isLinkSelectable = (d: Link) => {
      return this.isLinkSelectable(d);
    };

    const linkPaths = linkGroup
      .append("path")
      .attr("fill", "none")
      .attr("stroke", (d: Link) =>
        isLinkSelectable(d) ? DISASSEMBLY_RELEVANT_COLOR : GREY
      )
      .attr("stroke-width", STROKE_WIDTH)
      .attr("marker-end", (d: Link) =>
        isLinkSelectable(d)
          ? `url(#${MARKER_ID}-selectable)`
          : `url(#${MARKER_ID}-default)`
      )
      .attr("id", (_, i) => `link-path-${i}`);

    linkGroup
      .append("text")
      .attr("dy", -3)
      .attr("font-size", 10)
      .attr("fill", (d: Link) =>
        isLinkSelectable(d) ? DISASSEMBLY_RELEVANT_COLOR : GREY
      )
      .append("textPath")
      .attr("startOffset", "50%")
      .attr("xlink:href", (_, i) => `#link-path-${i}`)
      .attr("text-anchor", "middle")
      .text((d) => d.type || "");

    return linkPaths;
  }

  private drawNodeGroup(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    nodes: Node[],
    simulation: d3.Simulation<Node, Link>
  ) {
    const relevantNodeIds = new Set(
      this.dissassemblyRelevantGraphData?.nodes.map((n) => n.id)
    );

    const getNodeColor = (d: Node): string => {
      if (
        this.selectedNode &&
        d.properties.GUID === this.selectedNode.properties.GUID
      )
        return SELECTED_COLOR;
      if (relevantNodeIds.has(d.id)) return DISASSEMBLY_RELEVANT_COLOR;
      if (d.properties.GUID) return SELECTABLE_COLOR;
      return NODE_COLOR;
    };

    const nodeGroup = g
      .append("g")
      .attr("class", "node-group")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .on("click", (event, d) => {
        event.stopPropagation();
        this.selectNode(d);
        if (d.properties.GUID) {
          this.loadSubgraph(d.properties.GUID);
        }
      })
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("fill", d.properties.GUID ? SELECTABLE_COLOR : NODE_COLOR)
          .style("cursor", "pointer");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("fill", getNodeColor(d));
      })
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", this.dragstarted(simulation))
          .on("drag", this.dragged)
          .on("end", this.dragended(simulation))
      );

    nodeGroup
      .append("circle")
      .attr("class", "node")
      .attr("r", NODE_RADIUS)
      .attr("fill", getNodeColor)
      .attr("stroke", GREY)
      .attr("stroke-width", STROKE_WIDTH);

    nodeGroup
      .append("text")
      .attr("class", "label")
      .attr("font-size", 10)
      .attr("fill", "#000")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text((d) => {
        const name =
          d.properties.Name || d.properties.name || d.labels[0] || "";
        return name.length > 10 ? name.slice(0, 8) + "..." : name;
      });

    return nodeGroup;
  }

  private updateGraphPositions(
    linkPaths: d3.Selection<SVGPathElement, Link, SVGGElement, unknown>,
    nodeGroup: d3.Selection<SVGGElement, Node, SVGGElement, unknown>
  ) {
    linkPaths.attr("d", (d: any) => {
      const x1 = d.source.x;
      const y1 = d.source.y;
      const x2 = d.target.x;
      const y2 = d.target.y;
      return `M${x1},${y1} L${x2},${y2}`;
    });

    nodeGroup.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
  }

  private dragstarted(simulation: d3.Simulation<Node, Link>) {
    return function (event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    };
  }

  private dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  private dragended(simulation: d3.Simulation<Node, Link>) {
    return function (event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0);
      // Release the node so that the simulation can take over again
      event.subject.fx = null;
      event.subject.fy = null;
    };
  }

  private selectNode(node: Node | null) {
    if (!node) {
      this.propertiesPanel.clear();
      return;
    }

    this.propertiesPanel.displayElementProperties({
      elementInfo: node.properties,
    });

    if (node.properties.GUID)
      this.ifcViewer.selectElementByGUID(node.properties.GUID);

    // d3.selectAll("circle.node").attr("stroke-width", 1);
    // d3.selectAll("circle.node")
    //   .filter((d: any) => d.id === node.id)
    //   .attr("stroke-width", 2);
  }
}
