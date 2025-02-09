# 🌟 Hackathon Connection Detection in IFC Viewer 🌟

---

## 📚 Table of Contents

- [Overview](#overview)
- [Challenge Details](#challenge-details)
- [Directory Structure](#directory-structure)
- [Features](#features)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contribution](#contribution)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Standing on the Shoulders of Giants](#shoulders)

---

<h2 id="overview">🔍 Overview</h2>

This hackathon project is all about **Connection Detection and Visualization in Timber Construction**. It leverages modern web technologies such as [Three.js](https://threejs.org/) to:

- 🎨 **Visualize** IFC models with interactive 3D viewers.
- 🔍 **Detect** intersections and connections between building elements using robust raycasting and bounding-box checks.
- 🗂 **Explore** element properties with a dynamic model tree.
- 🛠 **Export** custom IFC5 files with advanced overrides (thick walls, annotation surfaces, spheres, etc.).
- 📊 **Analyze** connection data via CSV exports, PDF analyses, and automated image generation.

_Code isn't really clean, but it works well and is quite fast even on larger models._

---

<h2 id="challenge-details">🚀 Challenge Details</h2>

**Challenge Title:** **Find the Connection**

This challenge focuses on the categorization and visualization of building element connections derived from an **abstract hull body model**. The goal is to quantify and categorize these connections efficiently within the wood construction industry.

### Wood Construction Industry Context

- **Precise Planning:** Detailed systems of building elements.
- **Prefabrication:** Based on 3D models and digitally controlled tools.
- **On-Site Connections:** Designed for easy and fast mounting.
- **Logistics:** Streamlined processes for assembly and installation.

For effective collaboration among companies, it is crucial to delineate both physical and digital interfaces within a unified 3D model.

### Partners & Contacts

- **Edyta Augustynowicz** – BFH Berner Fachhochschule, Prof. Digital Fabrication and Wood.
- **Fabian Scheurer** – HM Hochschule München, Prof. Digitale Bautechnologie & Fabrikation.
- **Michael Schaerschaerholzbau** – Managing Director.

---

<h2 id="directory-structure">📁 Directory Structure</h2>

- **[ifc5-viewer/](ifc5-viewer/)**

  - **index.html** — Main entry point for the IFC5 viewer. Loads IFC models via file or URL input.
  - **render.mjs** — Contains the Three.js rendering logic, viewer initialization, model tree construction, and intersection detection.
  - **hello-wall.ifcx** — Example IFC5 file illustrating wall geometries and connections.

- **[ifc-viewer/](ifc-viewer/)**

  - **index.html** — Traditional viewer interface with additional controls and a model list.
  - **package.json** — Build configuration (using Vite, TypeScript, etc.) and dependency definitions.

- **[demo/](demo/)**

  - **02.html** — "Hackathon Corner Intersection Demo" showcasing basic intersection algorithms.
  - **03.html** — "Hackathon – Find the Connection" demo featuring connection classification techniques.
  - **explain.html** & **explain.md** — Detailed project explanations and overviews.
  - **raycast.html** — Demo of animated raycasting with real-time intersection detection.

- **[pdf_analysis/](pdf_analysis/)**

  - **Bauteilaufbauten schaerholzbau.pdf** — Sample PDF with design details and IFC analysis.
  - **extracted_ifc.csv** — CSV file containing extracted IFC connection data.
  - **match_excel_pdf_and_upload.py** — Script to process extracted data, generate images via PDF analysis, and upload results.

- **[ifc5-export-test/](ifc5-export-test/)**
  - **create_ifc5_file.py** — Python script to generate custom IFC5 files (with thick walls, annotation surfaces, spheres, etc.).

---

<h2 id="features">🌟 Features</h2>

- **Advanced Visualization:**  
  Render complex IFC models with interactive 3D controls via [Three.js](https://threejs.org/).

- **Connection Detection:**  
  Identify and classify intersections using raycasting and geometric analysis.

- **Dynamic Model Tree:**  
  Browse and inspect IFC models in a user-friendly hierarchy.

- **Demo Driven:**  
  Quick prototyping demos for rapid hackathon innovation.

- **Data Analysis & Export:**  
  Export CSV connection data, generate visual assets through PDF analysis, and integrate with external upload tools.

- **IFC5 Export:**  
  Programmatically generate IFC5 files with connection geometry for further processing. For now a rather theoretical feature but it's there.

---

<h2 id="getting-started">🚀 Getting Started</h2>

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, etc.)
- [Node.js](https://nodejs.org/) and npm (for the IFC Viewer)
- Python 3.6 or similiar (for export and analysis scripts)

### Setup Instructions

1. **Install Dependencies (for main IFC Viewer)**

   ```bash
   cd ifc-viewer
   npm install
   ```

2. **Run the IFC Viewer**

   Start the development server using Vite:

   ```bash
   npm run dev
   ```

3. **Clone the Ifc5 viewer Repo - if you need it**

   ```bash
   git clone https://github.com/buildingSMART/IFC5-development.git
   cd IFC5-development
   ```

4. **Run the Python Scripts - if you want to match pdf to model**

   From the repository root:

   ```bash
   python3 ifc5-export-test/create_ifc5_file.py
   python3 pdf_analysis/match_excel_pdf_and_upload.py
   ```

5. **Use the Demo Files to explore concepts applied in this project**

   Demo file paths:

   - [demo/raycast.html](demo/raycast.html)
   - [demo/explain.md](demo/explain.md)
   - [demo/01.html](demo/01.html)
   - [demo/02.html](demo/02.html)
   - [demo/03.html](demo/03.html)
   - [demo/explain.html](demo/explain.html)

---

<h2 id="usage">🛠 Usage</h2>

- **Loading Models:**  
  Use the file upload or URL input in [ifc5-viewer/index.html](ifc5-viewer/index.html) to load your IFC files.

- **Interacting with Models:**  
  Navigate using orbit controls; click on elements within the model tree to inspect detailed attributes.

- **Exploring Connections:**  
  Check connection data via the generated CSV ([pdf_analysis/extracted_ifc.csv](pdf_analysis/extracted_ifc.csv)) and refer to [demo/explain.md](demo/explain.md) and [demo/explain.html](demo/explain.html) for a deeper understanding.

- **Generating Custom IFC Files:**  
  We have a Button to export to Ifc5, developed and tested in [ifc5-export-test/](ifc5-export-test/) to produce IFC5 files with custom geometries and material overrides.

---

---

<h2 id="future-improvements">🔮 Future Improvements</h2>

The following enhancements were discussed for possible future development:

### Window Detection & Processing

Implement automatic window detection within wall elements. Add logic to process rectangular openings in walls as window elements. Integrate window-specific property sets and parameters for comprehensive window management in the model structure.

### Geometric Analysis Enhancement for Connections

Add comprehensive geometric calculations including area calculations for all connections. This will enable more detailed quantitative analysis of the model connections.

### Wall Classification & Type Mapping

Implement smart selection and classification. E.g. let user set all outer walls as Typ01. Develop property-based automatic mapping to streamline classification processes.

### Reference Management

Enhance user input for connection references beyond simply using IfcNames. Support for custom component sorting and improved connection hierarchies and dependencies will enhance model accuracy and usability.

### Performance Optimization

Optimize raycast operations for improved accuracy - especially on linear objects like beams - through strategic point origins. Reduce unnecessary ray calculations and dinamically adjust number of rays based on object size.

### Visualization Improvements

Enhance 2D representation capabilities with focus on connecting elements. Implement toggle functionality for different visualization modes and develop improved visual feedback for connection points to provide better user experience with Snapshots.

---

<h2 id="contribution">🤝 Contribution</h2>

Contributions, suggestions, and bug fixes are very welcome! Since this project was developed under hackathon conditions, some components are experimental and may evolve over time. Please fork the repository and open pull requests with your enhancements.

---

<h2 id="license">📜 License</h2>

This repository is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### What the AGPL-3.0 Means

- **Copyleft:** Any modifications or derivative works must be distributed under the same license.
- **Network Use Disclosure:** If you deploy a modified version of this software over a network, you must provide the corresponding source code to all users.
- **Source Code Availability:** You are required to make the source code available along with your distributed or network-hosted version.

For more details, please visit the [AGPL-3.0 License website](https://www.gnu.org/licenses/agpl-3.0.html).

---

<h2 id="acknowledgments">💖 Acknowledgments</h2>

- Special thanks to the challenge initiators and hackathon organizers
  -💝[buildingSMART International](https://github.com/buildingSMART/IFC5-development) for their foundational work.
- Many thanks to all hackathon participants and contributors for their creative input and rapid prototyping spirit!

---

<h2 id="shoulders">🌐 Standing on the Shoulders of Giants</h2>

This project draws inspiration from and builds upon the work of many remarkable open source projects and communities. In particular, we would like to acknowledge:

- **[ThatOpen/engine_web-ifc](https://github.com/ThatOpen/engine_web-ifc)** – An innovative project for reading and writing IFC files at native speeds, which has greatly influenced our approach.
- **[Three.js](https://threejs.org/)** – For providing an outstanding 3D rendering library that enables interactive web-based visualization.
- **[buildingSMART International](https://github.com/buildingSMART/IFC5-development)** – For the foundational work on the IFC5 standard and the IFC5 viewer.
- **[ifcopenshell](https://github.com/ifcopenshell/ifcopenshell)** – For a Python API to read and write IFC files.
- and many more...

We are grateful for the dedication of these communities; their contributions empower us to build cutting-edge solutions.

---

Happy hacking and enjoy exploring the future of timber construction, IFC, and connections! 🚀🔗
