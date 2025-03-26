import * as d3 from "d3";
import { IFCViewer } from "./IFCViewer";
import { GraphData, Node, Link } from "./types";
import { PropertiesPanel } from "./components/PropertiesPanel";

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
  private guid: string | null;
  private propertiesPanel: PropertiesPanel;
  private ifcViewer: IFCViewer | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.container.appendChild(this.svgElement);
    this.guid = null;
    this.propertiesPanel = new PropertiesPanel("neo4j-properties-panel");
  }

  public setIfcViewer(ifcViewer: IFCViewer) {
    this.ifcViewer = ifcViewer;
  }

  public async loadGraph(guid: string | null = null, force = false) {
    if (!force && guid === this.guid) return;
    this.guid = guid;
    await this.fetchGraphData();
  }

  private async fetchGraphData() {
    try {
      const url = this.guid
        ? `/api/graph?guid=${encodeURIComponent(this.guid)}`
        : "/api/graph";

      const response = await fetch(`${SERVER_BASE_URL}${url}`);
      const result = await response.json();

      if (result.success && result.data) {
        this.createForceGraph(result.data);
      }
    } catch (error) {
      console.error("Error fetching graph data:", error);
    }
  }

  private createForceGraph(data: GraphData) {
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

    const selectedNode = data.nodes.find(
      (node) => node.properties.GUID === this.guid
    );
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
      .attr("refX", 43)
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
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );
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
          .distance(150)
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));
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
      if (d.properties.GUID === this.guid) return NODE_SELECTED_COLOR;
      if (d.properties.GUID) return NODE_SELECTABLE_COLOR;
      return NODE_COLOR;
    };

    const nodeGroup = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g");

    nodeGroup
      .append("circle")
      .attr("class", "node")
      .attr("r", NODE_RADIUS)
      .attr("fill", getNodeColor)
      .attr("stroke", GREY)
      .attr("stroke-width", STROKE_WIDTH)
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", this.dragstarted(simulation))
          .on("drag", this.dragged)
          .on("end", this.dragended(simulation))
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.properties.GUID) {
          this.loadGraph(d.properties.GUID);
        }
        this.selectNode(d);
      })
      .on("mouseover", function (event, d) {
        d3.select(this)
          .attr("fill", d.properties.GUID ? NODE_SELECTED_COLOR : NODE_COLOR)
          .style("cursor", "pointer");
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("fill", getNodeColor(d));
      });

    nodeGroup
      .append("text")
      .attr("class", "label")
      .attr("font-size", 10)
      .attr("fill", "#000")
      .attr("pointer-events", "none")
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
    linkPaths: d3.Selection<SVGTextElement, Link, SVGGElement, unknown>,
    nodeGroup: d3.Selection<SVGCircleElement, Node, SVGGElement, unknown>
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
    return function (event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    };
  }

  private dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  private dragended(simulation: d3.Simulation<Node, Link>) {
    return function (event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0);
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
  }
}
