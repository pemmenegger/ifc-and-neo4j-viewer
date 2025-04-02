import { Neo4jViewer } from "@/Neo4jViewer";
import { FilterPanel } from "./FilterPanel";

export class Neo4jFilterPanel extends FilterPanel {
  private viewer: Neo4jViewer;

  constructor(viewer: Neo4jViewer) {
    super("neo4j-filter-panel", "neo4j-properties-panel");
    this.viewer = viewer;
  }

  protected applyFilters(): void {
    console.log("[Neo4jFilterPanel] Applying filters:", this.activeFilters);

    const shouldApply = this.activeFilters.has("Only Disassembly Graph");
    this.viewer.toggleOnlyDisassemblyGraphFilter(shouldApply);
  }
}
