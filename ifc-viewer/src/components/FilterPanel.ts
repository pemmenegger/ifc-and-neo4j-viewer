import { IFCViewer } from "../app";

export class FilterPanel {
  private viewer: IFCViewer;
  private container: HTMLElement;
  private activeFilters: Set<string>;
  private content: HTMLElement;

  constructor(viewer: IFCViewer) {
    this.viewer = viewer;
    this.activeFilters = new Set();
    this.container = document.createElement("div");
    this.container.className = "filter-panel";
    this.content = document.createElement("div");
    this.content.className = "filter-content";
    this.setupPanel();
  }

  private setupPanel(): void {
    const header = document.createElement("div");
    header.className = "filter-header";
    header.innerHTML = `
      <h3>IFC Filters</h3>
      <button class="filter-toggle">
        <i class="fas fa-filter"></i>
      </button>
    `;

    this.container.appendChild(header);
    this.container.appendChild(this.content);
    document.body.appendChild(this.container);
  }

  public updateFilters(): void {
    // Clear existing filters
    this.content.innerHTML = '';
    this.activeFilters.clear();

    // Collect all unique IFC types from the loaded models
    const ifcTypes = new Set<string>();
    this.viewer.traverse((object: THREE.Object3D) => {
      if (object.userData?.type === "element" && object.userData.ifcType) {
        ifcTypes.add(object.userData.ifcType);
      }
    });

    // Create filter items for each IFC type
    Array.from(ifcTypes).sort().forEach(className => {
      const filterItem = this.createFilterItem(className);
      this.content.appendChild(filterItem);
    });
  }

  private createFilterItem(className: string): HTMLElement {
    const item = document.createElement("div");
    item.className = "filter-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `filter-${className}`;
    checkbox.checked = true;

    const label = document.createElement("label");
    label.htmlFor = `filter-${className}`;
    label.textContent = className.replace("IFC", "");

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        this.activeFilters.delete(className);
      } else {
        this.activeFilters.add(className);
      }
      this.applyFilters();
    });

    item.appendChild(checkbox);
    item.appendChild(label);
    return item;
  }

  private applyFilters(): void {
    this.viewer.traverse((object: THREE.Object3D) => {
      // Handle regular IFC elements
      if (object.userData?.type === "element") {
        const ifcType = object.userData.ifcType;
        const shouldBeVisible = !this.activeFilters.has(ifcType);
        object.visible = shouldBeVisible;

        // Also hide any associated connection geometries
        object.traverse((child: THREE.Object3D) => {
          if (child.userData?.type === "connection") {
            child.visible = shouldBeVisible;
          }
        });
      }
      // Handle standalone connection geometries
      else if (object.userData?.type === "connection") {
        const parentElement = object.parent;
        if (parentElement && parentElement.userData?.type === "element") {
          const parentType = parentElement.userData.ifcType;
          object.visible = !this.activeFilters.has(parentType);
        }
      }
    });
  }
}
