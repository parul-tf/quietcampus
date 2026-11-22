import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_logo(size=512):
    # Create high-res image with RGBA
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = size / 2
    radius = size * 0.46

    # 1. Background Circle with Navy Gradient Simulation
    for r in range(int(radius), 0, -1):
        ratio = r / radius
        # Gradient from #090e17 (edge) to #1e293b (center)
        red = int(9 + (30 - 9) * (1 - ratio))
        green = int(14 + (41 - 14) * (1 - ratio))
        blue = int(23 + (59 - 23) * (1 - ratio))
        draw.ellipse([center - r, center - r, center + r, center + r], fill=(red, green, blue, 255))

    # 2. Outer Glowing Ring (#14b8a6 / #2dd4bf)
    ring_width = int(size * 0.032)
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        outline=(20, 184, 166, 255),
        width=ring_width
    )

    # 3. Inner Subtle Sound Arc Ripples
    arc_radius1 = size * 0.36
    draw.arc(
        [center - arc_radius1, center - arc_radius1, center + arc_radius1, center + arc_radius1],
        start=210, end=330, fill=(45, 212, 191, 140), width=int(size * 0.016)
    )
    draw.arc(
        [center - arc_radius1, center - arc_radius1, center + arc_radius1, center + arc_radius1],
        start=30, end=150, fill=(45, 212, 191, 140), width=int(size * 0.016)
    )

    # 4. Central Microphone / Decibel Pulse Graphic
    # Vertical Soundwave Bars (5 symmetric bars)
    bar_width = int(size * 0.048)
    gap = int(size * 0.038)
    heights = [size * 0.16, size * 0.28, size * 0.42, size * 0.28, size * 0.16]
    colors = [
        (45, 212, 191, 230),  # #2dd4bf
        (20, 184, 166, 245),  # #14b8a6
        (56, 189, 248, 255),  # #38bdf8 (center cyan glow)
        (20, 184, 166, 245),
        (45, 212, 191, 230)
    ]

    total_width = 5 * bar_width + 4 * gap
    start_x = center - total_width / 2

    for i in range(5):
        bx = start_x + i * (bar_width + gap)
        bh = heights[i]
        by = center - bh / 2
        corner = int(bar_width / 2)
        draw.rounded_rectangle(
            [bx, by, bx + bar_width, by + bh],
            radius=corner,
            fill=colors[i]
        )

    # 5. Microphone Stand / Base subtle curve
    base_w = size * 0.24
    base_h = size * 0.016
    draw.rounded_rectangle(
        [center - base_w/2, center + size * 0.26, center + base_w/2, center + size * 0.26 + base_h],
        radius=int(base_h/2),
        fill=(56, 189, 248, 200)
    )

    return img

def main():
    base_dir = r"C:\Users\thaku\.gemini\antigravity\scratch\quietcampus-sdg-app"
    logo512 = create_logo(512)
    
    # Save master logo and favicon
    logo_path = os.path.join(base_dir, "app-logo.png")
    logo512.save(logo_path, "PNG")
    print("Saved app-logo.png")

    favicon_path = os.path.join(base_dir, "favicon.png")
    logo512.resize((64, 64), Image.Resampling.LANCZOS).save(favicon_path, "PNG")
    print("Saved favicon.png")

    # Generate Android mipmap directories and sizes
    mipmaps = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192
    }

    res_dir = os.path.join(base_dir, "android_res")
    for folder, dim in mipmaps.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        icon_img = logo512.resize((dim, dim), Image.Resampling.LANCZOS)
        icon_img.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        icon_img.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
        print(f"Generated {folder}/ic_launcher.png ({dim}x{dim})")

if __name__ == "__main__":
    main()
