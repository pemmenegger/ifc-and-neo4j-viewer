import * as d3 from "d3";
import { IFCViewer } from "./IFCViewer";
import { GraphData, Node, Link } from "./types";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Neo4jFilterPanel } from "./components/Neo4jFilterPanel";

const SERVER_BASE_URL = "http://localhost:3001";
const NODE_RADIUS = 30;
const NODE_SELECTED_COLOR = "#ff9800";
const NODE_SELECTABLE_COLOR = "#dcdcdc";
const NODE_COLOR = "#f8f9fa";
const GREY = "#666";
const STROKE_WIDTH = 1.5;
const MARKER_ID = "arrow";

export class Neo4jViewer {
  private container: HTMLElement;
  private svgElement: SVGSVGElement;
  private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private fullGraphData: GraphData | null = null;
  private selectedNodeGuid: string | null;
  private propertiesPanel: PropertiesPanel;
  private filterPanel: Neo4jFilterPanel;
  private ifcViewer: IFCViewer | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.container.appendChild(this.svgElement);
    this.selectedNodeGuid = null;
    this.propertiesPanel = new PropertiesPanel("neo4j-properties-panel");
    this.filterPanel = new Neo4jFilterPanel(this);
  }

  public setIfcViewer(ifcViewer: IFCViewer) {
    this.ifcViewer = ifcViewer;
  }

  public async loadGraph(
    selectedNodeGuid: string | null = null,
    force = false
  ) {
    if (!force && selectedNodeGuid === this.selectedNodeGuid) return;
    this.selectedNodeGuid = selectedNodeGuid;
    await this.fetchGraphData();
    this.filterPanel.updateFilters(
      new Map([["Only Disassembly Graph", false]])
    );
  }

  private async fetchGraphData() {
    try {
      const url = this.selectedNodeGuid
        ? `/api/graph?guid=${encodeURIComponent(this.selectedNodeGuid)}`
        : "/api/graph";

      const response = await fetch(`${SERVER_BASE_URL}${url}`);
      const result = await response.json();

      if (result.success && result.data) {
        this.fullGraphData = result.data;
        this.createForceGraph(result.data);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  }

  private getSelectedNode() {
    if (!this.fullGraphData) return null;
    return this.fullGraphData.nodes.find(
      (node) => node.properties.GUID === this.selectedNodeGuid
    );
  }

  public toggleOnlyDissassemblyGraphFilter(shouldApply: boolean) {
    if (!this.fullGraphData) return;

    if (!shouldApply) {
      this.createForceGraph(this.fullGraphData);
      return;
    }

    if (!this.selectedNodeGuid) return;

    const allLinks = new Set<Link>(
      this.fullGraphData.links.filter((link) => link.source && link.target)
    );

    const selectedNode = this.getSelectedNode();
    if (!selectedNode) return;

    const getNodeId = (node: string | { id: string }) =>
      typeof node === "string" ? node : node.id;

    const relevantLinks = new Set<Link>();
    const relevantNodeIds = new Set<string>([selectedNode.id]);

    for (const link of allLinks) {
      if (
        link.type === "matchedArchetype" &&
        getNodeId(link.source) === selectedNode.id
      ) {
        const targetId = getNodeId(link.target);
        relevantLinks.add(link);
        relevantNodeIds.add(targetId);
      }
    }

    let expanded = true;
    while (expanded) {
      expanded = false;

      for (const link of allLinks) {
        const sourceId = getNodeId(link.source);
        const targetId = getNodeId(link.target);

        if (
          sourceId !== selectedNode.id &&
          relevantNodeIds.has(sourceId) &&
          !relevantNodeIds.has(targetId)
        ) {
          relevantNodeIds.add(targetId);
          expanded = true;

          // Add all links connected to this new target node (excluding back to selectedNode)
          for (const l of allLinks) {
            const lSource = getNodeId(l.source);
            const lTarget = getNodeId(l.target);

            if (
              (lSource === targetId && lTarget !== selectedNode.id) ||
              (lTarget === targetId && lSource !== selectedNode.id)
            ) {
              relevantLinks.add(l);
            }
          }
        }
      }
    }

    const filteredNodes = this.fullGraphData.nodes.filter((node) =>
      relevantNodeIds.has(node.id)
    );
    if (!filteredNodes.includes(selectedNode)) {
      filteredNodes.push(selectedNode);
    }

    this.createForceGraph({
      nodes: filteredNodes,
      links: Array.from(relevantLinks),
    });
  }

  private createForceGraph(data: GraphData) {
    this.resetZoom();

    const svg = this.setupSvgCanvas();
    const g = svg.append("g");
    this.setupZoom(svg, g);
    this.defineLinkArrow(svg);

    const simulation = this.setupSimulation(data);
    const linkPaths = this.drawLinkPaths(g, data.links);
    const nodeGroup = this.drawNodeGroup(g, data.nodes, simulation);
    simulation.on("tick", () => {
      this.updateGraphPositions(linkPaths, nodeGroup);
    });

    const selectedNode = this.getSelectedNode();
    this.selectNode(selectedNode);
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

  private defineLinkArrow(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  ) {
    svg
      .append("defs")
      .selectAll("marker")
      .data(["end"])
      .enter()
      .append("marker")
      .attr("id", MARKER_ID)
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
          .distance(160)
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
      .selectAll("g")
      .data(links)
      .enter()
      .append("g");

    const linkPaths = linkGroup
      .append("path")
      .attr("fill", "none")
      .attr("stroke", GREY)
      .attr("stroke-width", STROKE_WIDTH)
      .attr("marker-end", `url(#${MARKER_ID})`)
      .attr("id", (_, i) => `link-path-${i}`);

    linkGroup
      .append("text")
      .attr("dy", -3)
      .attr("font-size", 10)
      .attr("fill", GREY)
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
    const getNodeColor = (d: Node): string => {
      if (d.properties.GUID === this.selectedNodeGuid)
        return NODE_SELECTED_COLOR;
      if (d.properties.GUID) return NODE_SELECTABLE_COLOR;
      return NODE_COLOR;
    };

    const nodeGroup = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .on("click", (event, d) => {
        event.stopPropagation();
        this.selectNode(d);
        if (d.properties.GUID) {
          this.loadGraph(d.properties.GUID);
        }
      })
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("fill", d.properties.GUID ? NODE_SELECTED_COLOR : NODE_COLOR)
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

    d3.selectAll("circle.node").attr("stroke-width", 1);
    d3.selectAll("circle.node")
      .filter((d: any) => d.id === node.id)
      .attr("stroke-width", 2);
  }
}
