import * as d3 from "d3";
import { IFCViewer } from "./IFCViewer";

interface Node {
  id: string;
  labels: string[];
  properties: Record<string, any>;
  x: number;
  y: number;
}
interface Link {
  source: string | Node;
  target: string | Node;
  type: string;
  properties: Record<string, any>;
}
interface GraphData {
  nodes: Node[];
  links: Link[];
}

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
  private selectedNode: Node | null;
  private graphData: GraphData | null;
  private ifcViewer: IFCViewer | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    this.container.appendChild(this.svgElement);
    this.guid = null;
    this.selectedNode = null;
    this.graphData = null;
  }

  public setIfcViewer(ifcViewer: IFCViewer) {
    this.ifcViewer = ifcViewer;
  }

  public async loadGraph(guid: string | null = null) {
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
        this.graphData = result.data;
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
    const { linkLines, linkLabels } = this.drawLinks(g, data.links);
    const { nodeCircles, nodeLabels } = this.drawNodes(
      g,
      data.nodes,
      simulation
    );
    // const links = this.drawLinks(g, data.links);
    // const linkLabels = this.drawLinkLabels(g, data.links);
    // const node = this.drawNodes(g, data.nodes, simulation);
    // const nodeLabels = this.drawNodeLabels(g, data.nodes);

    simulation.on("tick", () => {
      this.updateGraphPositions(linkLines, linkLabels, nodeCircles, nodeLabels);
    });
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

  private drawLinks(
    g: d3.Selection<SVGGElement, unknown, null, undefined>,
    links: Link[]
  ) {
    const linkGroup = g
      .append("g")
      .selectAll("g")
      .data(links)
      .enter()
      .append("g");

    const linkLines = linkGroup
      .append("line")
      .attr("class", "link")
      .attr("stroke", GREY)
      .attr("stroke-width", STROKE_WIDTH)
      .attr("marker-end", `url(#${MARKER_ID})`);

    const linkLabels = linkGroup
      .append("text")
      .text((d: Link) => d.type)
      .attr("class", "link-label")
      .attr("fill", "#000")
      .attr("font-size", 10)
      .attr("text-anchor", "middle");

    return { linkLines, linkLabels };
  }

  private drawNodes(
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

    const nodeCircles = nodeGroup
      .append("circle")
      .attr("class", "node")
      .attr("r", NODE_RADIUS)
      .attr("fill", (d: Node) => getNodeColor(d))
      .attr("stroke", GREY)
      .attr("stroke-width", STROKE_WIDTH)
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", this.dragstarted(simulation))
          .on("drag", this.dragged)
          .on("end", this.dragended(simulation))
      )
      .on(
        "click",
        (event, d: Node) => d.properties.GUID && this.selectNode(event, d)
      )
      .on("mouseover", (event: MouseEvent, d: Node): void => {
        d3.select(event.currentTarget as SVGCircleElement)
          .attr("fill", d.properties.GUID ? NODE_SELECTED_COLOR : NODE_COLOR)
          .attr("style", "cursor: pointer;");
      })
      .on("mouseout", (event: MouseEvent, d: Node): void => {
        d3.select(event.currentTarget as SVGCircleElement).attr("fill", () =>
          getNodeColor(d)
        );
      });

    const nodeLabels = nodeGroup
      .append("text")
      .attr("font-size", 10)
      .attr("fill", "#000")
      .attr("user-select", "none")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .text((d) => {
        const name = d.properties.Name || d.properties.name || d.labels[0];
        return name.length > 10 ? name.substring(0, 8) + "..." : name;
      });

    return { nodeCircles, nodeLabels };
  }

  private updateGraphPositions(
    linkLines: d3.Selection<SVGLineElement, Link, SVGGElement, unknown>,
    linkLabels: d3.Selection<SVGTextElement, Link, SVGGElement, unknown>,
    nodeCircles: d3.Selection<SVGCircleElement, Node, SVGGElement, unknown>,
    nodeLabels: d3.Selection<SVGTextElement, Node, SVGGElement, unknown>
  ) {
    linkLines
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => d.target.x)
      .attr("y2", (d: any) => d.target.y);

    linkLabels
      .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
      .attr("y", (d: any) => (d.source.y + d.target.y) / 2 - 5);

    nodeCircles.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    nodeLabels.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
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

  private selectNode(event: MouseEvent, node: Node) {
    event.stopPropagation();
    this.selectedNode = { ...node, x: 10, y: 10 };
    console.log("Selected Node GUID:", node.properties.GUID);

    // this.ifcViewer?.selectNode?.(node.properties.GUID);
    this.loadGraph(node.properties.GUID);

    // TODO:
    // - Show node + edge details
    // - Sync with IFC viewer
  }
}
