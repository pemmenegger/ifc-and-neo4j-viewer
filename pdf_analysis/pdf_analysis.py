import fitz
import os

CATALOG_NAME = "Bauteilaufbauten schaerholzbau.pdf"
PATH_TO_SAVE_IMAGES = os.path.join(os.getcwd(), "images")


def get_page(keyword):
    doc = fitz.open(CATALOG_NAME)
    for page_num in range(doc.page_count):
        page = doc.load_page(page_num)
        text = page.get_text()
        if keyword in text:
            return page, (page_num + 1)
    raise ValueError(f"keyword {keyword} not found!")


def render_page_and_save(page, page_num):
    # Set up the transformation matrix for zooming and rotation
    mat = fitz.Matrix(1.0, 1.0).prerotate(0)

    # Render the page to a pixmap (image)
    pix = page.get_pixmap(matrix=mat)

    # Save the image to the specified path
    image_name = "page_" + str(page_num) + ".png"
    image_path = os.path.join(PATH_TO_SAVE_IMAGES, image_name)
    pix.save(image_path)


def main():
    # scrap the pdf and return the page number with a specific keyword
    keyword = "Aussenwand AW 1.1"
    page, page_num = get_page(keyword)

    # render the page with the given page number
    render_page_and_save(page, page_num)


if __name__ == "__main__":
    main()
