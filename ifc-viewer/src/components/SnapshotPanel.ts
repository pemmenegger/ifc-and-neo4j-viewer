import { IFCViewer } from "../app";

export class SnapshotPanel {
  private container: HTMLElement;
  private panel: HTMLElement;
  private enlargedImageSrc?: string;

  constructor(viewer: IFCViewer) {
    this.container = viewer.getContainer();
    this.createPanel();
  }

  private createPanel(): void {
    this.panel = document.createElement("div");
    this.panel.className = "snapshot-panel";
    Object.assign(this.panel.style, {
      position: "absolute",
      top: "50px",
      right: "50px",
      width: "300px",
      padding: "10px",
      background: "rgba(0, 0, 0, 0.8)",
      border: "1px solid white",
      borderRadius: "4px",
      zIndex: "2000",
      display: "none",
      color: "white",
      maxHeight: "calc(100vh - 60px)",
      overflowY: "auto",
    });

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerText = "Close";
    Object.assign(closeButton.style, {
      position: "absolute",
      top: "5px",
      right: "5px",
      background: "red",
      color: "white",
      border: "none",
      cursor: "pointer",
      padding: "2px 6px",
      fontSize: "12px",
    });
    closeButton.addEventListener("click", () => this.hide());

    this.panel.appendChild(closeButton);

    // Image element to display snapshot
    const imgElem = document.createElement("img");
    imgElem.id = "snapshot-image";
    Object.assign(imgElem.style, {
      width: "100%",
      marginTop: "30px",
    });
    imgElem.addEventListener("load", () => {
      console.log("SnapshotPanel: Image loaded successfully.");
    });
    this.panel.appendChild(imgElem);

    // Enlarge button to open snapshot in a new window
    const enlargeButton = document.createElement("button");
    enlargeButton.innerText = "Enlarge";
    Object.assign(enlargeButton.style, {
      position: "absolute",
      bottom: "10px",
      right: "10px",
      background: "#1a73e8",
      color: "white",
      border: "none",
      cursor: "pointer",
      padding: "4px 8px",
      fontSize: "12px",
      borderRadius: "4px",
    });
    enlargeButton.addEventListener("click", () => {
      if (this.enlargedImageSrc) {
        window.open(this.enlargedImageSrc, "_blank");
      }
    });
    this.panel.appendChild(enlargeButton);

    this.container.appendChild(this.panel);
  }

  public show(verticalImageSrc: string, horizontalImageSrc?: string): void {
    const imgElem = this.panel.querySelector(
      "#snapshot-image"
    ) as HTMLImageElement;
    imgElem.src = verticalImageSrc;
    this.enlargedImageSrc = horizontalImageSrc || verticalImageSrc;
    console.log(
      "SnapshotPanel: Showing snapshot with src:",
      verticalImageSrc.slice(0, 50) + "..."
    );
    this.panel.style.display = "block";
  }

  public hide(): void {
    this.panel.style.display = "none";
  }
}
