import * as d3 from "d3";

interface Node {
  id: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  properties: { [key: string]: any };
}

interface Link {
  source: string | Node;
  target: string | Node;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

const SERVER_BASE_URL = "http://localhost:3001";

export class Neo4jViewer {
  private container: HTMLElement;
  private svgElement: SVGSVGElement;
  private guid: string | null;
  private selectedNode: Node | null;
  private graphData: GraphData | null;

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
    if (!this.svgElement) return;

    d3.select(this.svgElement).selectAll("*").remove();

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const svg = d3
      .select(this.svgElement)
      .attr("width", width)
      .attr("height", height);
    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3
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

    const link = g
      .append("g")
      .selectAll("line")
      .data(data.links)
      .enter()
      .append("line")
      .attr("stroke", "#666")
      .attr("stroke-width", 1.5);

    const node = g
      .append("g")
      .selectAll("circle")
      .data(data.nodes)
      .enter()
      .append("circle")
      .attr("r", 20)
      .attr("fill", (d) =>
        d.properties.GlobalId === this.guid ? "#ff6b6b" : "#44aa88"
      )
      .attr("stroke", "#666")
      .attr("stroke-width", 1.5)
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", this.dragstarted(simulation))
          .on("drag", this.dragged)
          .on("end", this.dragended(simulation))
      )
      .on("click", (event, d) => this.selectNode(event, d));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);
      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    });
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
    this.selectedNode = {
      ...node,
      x: 10,
      y: 10,
    };
    console.log("Selected Node:", this.selectedNode);
  }
}
