export abstract class FilterPanel {
  protected panel!: HTMLElement | null;
  protected container!: HTMLElement | null;
  protected content!: HTMLElement | null;
  protected activeFilters: Set<string>;

  constructor(panelId: string, propertiesPanelId: string) {
    this.setupPanel(panelId);
    this.setupPanelCollapseObserver(propertiesPanelId);
    this.activeFilters = new Set();
  }

  private setupPanel(panelId: string): void {
    this.panel = document.querySelector(`#${panelId}`);
    if (!this.panel) {
      console.error("Failed to find filter panel with ID:", panelId);
      return;
    }

    this.container = this.panel.querySelector(".filter-panel");
    if (!this.container) {
      console.error("Failed to find filter panel container with ID:", panelId);
      return;
    }

    this.content = this.panel.querySelector(".filter-content");
    if (!this.content) {
      console.error("Failed to find filter panel content with ID:", panelId);
      return;
    }

    const toggleBtn = this.panel.querySelector(
      ".filter-toggle"
    ) as HTMLButtonElement;
    if (!toggleBtn) {
      console.error(
        "Failed to find filter panel toggle button with ID:",
        panelId
      );
      return;
    }

    toggleBtn.addEventListener("click", () => {
      this.container.classList.toggle("collapsed");
    });
  }

  private setupPanelCollapseObserver(propertiesPanelId: string): void {
    const propertiesPanel = document.querySelector(
      `#${propertiesPanelId} > .properties-panel
    `
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

  private createFilterItem(className: string, checked: boolean): HTMLElement {
    const item = document.createElement("div");
    item.className = "filter-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `filter-${className}`;
    checkbox.checked = checked;

    const label = document.createElement("label");
    label.htmlFor = `filter-${className}`;

    if (className.startsWith("Ifc")) {
      label.textContent = `Type ${className}`;
    } else if (className.startsWith("IFC")) {
      label.textContent = className.replace("IFC", "");
    } else {
      label.textContent = className;
    }

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        this.activeFilters.add(className);
      } else {
        this.activeFilters.delete(className);
      }
      this.applyFilters();
    });

    if (checked) {
      this.activeFilters.add(className);
    }

    item.appendChild(checkbox);
    item.appendChild(label);
    return item;
  }

  public updateFilters(data: Map<string, boolean>): void {
    console.log("[FilterPanel] Updating filters:", data);
    this.content.innerHTML = "";
    this.activeFilters.clear();

    Array.from(data.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([className, isChecked]) => {
        const item = this.createFilterItem(className, isChecked);
        this.content.appendChild(item);
      });

    this.applyFilters();
  }

  protected abstract applyFilters(): void;
}
