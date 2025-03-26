import { IFCViewer } from "../IFCViewer";

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
    this.setupPanelCollapseObserver();
  }

  private setupPanel(): void {
    const header = document.createElement("div");
    header.className = "filter-header";
    header.innerHTML = `
      <h3>IFC Filters</h3>
      <button class="filter-toggle">
        <i class="fas fa-chevron-up"></i>
      </button>
    `;

    // Add toggle functionality
    const toggleBtn = header.querySelector(
      ".filter-toggle"
    ) as HTMLButtonElement;
    toggleBtn.addEventListener("click", () => {
      this.container.classList.toggle("collapsed");
    });

    this.container.appendChild(header);
    this.container.appendChild(this.content);
    document.body.appendChild(this.container);
  }

  private setupPanelCollapseObserver(): void {
    const propertiesPanel = document.querySelector(
      "#ifc-properties-panel > .properties-panel"
    );
    if (!propertiesPanel) {
      console.error("Failed to find properties panel");
      return;
    }

    const observer = new MutationObserver(() => {
      const isCollapsed = propertiesPanel.classList.contains("collapsed");
      this.container.style.right = isCollapsed ? "60px" : "340px";
    });

    observer.observe(propertiesPanel, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  public updateFilters(): void {
    console.log("[FilterPanel] Starting filter update");
    this.content.innerHTML = "";
    this.activeFilters.clear();

    // Collect all unique IFC types from the loaded models
    const ifcTypes = new Set<string>();
    console.log("[FilterPanel] Traversing models...");

    this.viewer.traverse((object: THREE.Object3D) => {
      try {
        console.log(`Processing object: ${object.name}`, object.userData);

        if (object.userData?.type === "element") {
          const ifcType = object.userData.ifcType;
          console.log(`Found IFC element: ${ifcType}`);

          if (ifcType) {
            ifcTypes.add(ifcType);
          } else {
            console.warn("Element missing ifcType:", object);
          }
        }
      } catch (error) {
        console.error("Error processing object:", object, error);
      }
    });

    console.log("Unique IFC types found:", Array.from(ifcTypes));

    // Create filter items for each IFC type
    Array.from(ifcTypes)
      .sort()
      .forEach((className) => {
        console.log(`Creating filter for: ${className}`);
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

    // Handle numeric type codes and proper IFC names
    const displayName = className.startsWith("IFC")
      ? className.replace("IFC", "")
      : `Type ${className}`;

    label.textContent = displayName;

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
    console.log(
      "[FilterPanel] Applying filters. Active filters:",
      this.activeFilters
    );

    this.viewer.traverse((object: THREE.Object3D) => {
      try {
        // Handle regular IFC elements
        if (object.userData?.type === "element") {
          const ifcType = object.userData.ifcType;
          const shouldBeVisible = !this.activeFilters.has(ifcType);

          console.log(`Setting visibility for ${ifcType}: ${shouldBeVisible}`);
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
      } catch (error) {
        console.error("Error applying filters to object:", object, error);
      }
    });
  }
}
