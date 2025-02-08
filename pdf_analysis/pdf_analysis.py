import fitz

path_to_catalog = "Bauteilaufbauten schaerholzbau.pdf"

doc = fitz.open(path_to_catalog)
# Iterate through each page
with open("fitz_method_1.txt", "w", encoding="utf-8") as f:
    for page_num in range(doc.page_count):
        page = doc.load_page(page_num)
        text = page.get_text()

        f.write(f"--- Page {page_num + 1} ---\n")
        f.write(text)
        f.write("\n\n")
