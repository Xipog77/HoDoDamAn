import os
import math
from PIL import Image, ImageDraw, ImageFont

def create_pwa_icon(size, is_maskable=False):
    # Create image with transparent or full background depending on maskable
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    center = size / 2
    
    if is_maskable:
        # Full bleed background for maskable icons
        draw.rectangle([0, 0, size, size], fill=(74, 36, 11, 255)) # #4a240b wood-800
        radius = size * 0.40 # Safe zone inside 80% circle
    else:
        # Rounded or circular icon
        radius = size * 0.46
        draw.ellipse([center - radius, center - radius, center + radius, center + radius], fill=(74, 36, 11, 255))
    
    # Outer decorative gold ring
    ring_radius = radius * 0.94
    ring_width = max(2, int(size * 0.025))
    draw.ellipse(
        [center - ring_radius, center - ring_radius, center + ring_radius, center + ring_radius],
        outline=(202, 154, 58, 255), # #CA9A3A gold-500
        width=ring_width
    )
    
    # Inner thin gold ring
    inner_ring = ring_radius * 0.88
    draw.ellipse(
        [center - inner_ring, center - inner_ring, center + inner_ring, center + inner_ring],
        outline=(252, 211, 77, 180), # #fcd34d gold-300
        width=max(1, int(size * 0.01))
    )
    
    # Radiating ancestral rays (Bronze drum / Trống đồng starburst motif)
    num_rays = 12
    ray_outer = inner_ring * 0.95
    ray_inner = inner_ring * 0.72
    for i in range(num_rays):
        angle = (i * 2 * math.pi) / num_rays
        next_angle = ((i + 0.5) * 2 * math.pi) / num_rays
        
        x_out = center + ray_outer * math.cos(angle)
        y_out = center + ray_outer * math.sin(angle)
        x_in1 = center + ray_inner * math.cos(angle - 0.15)
        y_in1 = center + ray_inner * math.sin(angle - 0.15)
        x_in2 = center + ray_inner * math.cos(angle + 0.15)
        y_in2 = center + ray_inner * math.sin(angle + 0.15)
        
        draw.polygon([(x_out, y_out), (x_in1, y_in1), (center, center), (x_in2, y_in2)], fill=(202, 154, 58, 120))

    # Center circle for Family Emblem
    center_radius = inner_ring * 0.65
    draw.ellipse(
        [center - center_radius, center - center_radius, center + center_radius, center + center_radius],
        fill=(45, 21, 8, 255), # #2d1508 wood-900
        outline=(251, 191, 36, 255), # #fbbf24 gold-400
        width=max(2, int(size * 0.018))
    )

    # Stylized Tree Canopy & Trunk (symbol of genealogy / nguồn cội)
    tree_bottom = center + center_radius * 0.65
    tree_top = center - center_radius * 0.55
    trunk_w = max(3, int(size * 0.035))
    
    # Trunk
    draw.rectangle([center - trunk_w/2, center - center_radius * 0.1, center + trunk_w/2, tree_bottom], fill=(202, 154, 58, 255))
    
    # Tree roots
    root_len = center_radius * 0.35
    draw.line([(center, tree_bottom), (center - root_len, tree_bottom + size*0.015)], fill=(202, 154, 58, 255), width=max(2, int(size*0.015)))
    draw.line([(center, tree_bottom), (center + root_len, tree_bottom + size*0.015)], fill=(202, 154, 58, 255), width=max(2, int(size*0.015)))

    # Canopy branches / leaves (3 tiers of lush stylized arches)
    tier_colors = [(252, 211, 77, 240), (251, 191, 36, 240), (202, 154, 58, 240)]
    tiers = [
        (tree_top, center_radius * 0.35),
        (tree_top + center_radius * 0.25, center_radius * 0.50),
        (tree_top + center_radius * 0.50, center_radius * 0.60)
    ]
    for (y_pos, w_rad), col in zip(tiers, tier_colors):
        h_rad = w_rad * 0.6
        draw.ellipse([center - w_rad, y_pos - h_rad*0.5, center + w_rad, y_pos + h_rad*0.8], fill=col)
    
    # Small golden fruit/dots on the tree representing generations
    dot_radius = max(2, int(size * 0.015))
    dots = [
        (center - center_radius * 0.28, tree_top + center_radius * 0.3),
        (center + center_radius * 0.28, tree_top + center_radius * 0.3),
        (center - center_radius * 0.4, tree_top + center_radius * 0.55),
        (center + center_radius * 0.4, tree_top + center_radius * 0.55),
        (center, tree_top - center_radius * 0.1),
    ]
    for dx, dy in dots:
        draw.ellipse([dx - dot_radius, dy - dot_radius, dx + dot_radius, dy + dot_radius], fill=(255, 255, 255, 250))

    return img

def create_badge_icon(size):
    # Badge is a small white/transparent silhouette for Android status bar
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    center = size / 2
    r = size * 0.44
    draw.ellipse([center - r, center - r, center + r, center + r], outline=(255, 255, 255, 255), width=max(2, int(size*0.06)))
    
    # Simple tree silhouette in pure white
    trunk_w = max(2, int(size * 0.08))
    draw.rectangle([center - trunk_w/2, center, center + trunk_w/2, center + r * 0.7], fill=(255, 255, 255, 255))
    draw.ellipse([center - r * 0.5, center - r * 0.6, center + r * 0.5, center + r * 0.2], fill=(255, 255, 255, 255))
    return img

def main():
    icons_dir = os.path.join('public', 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    # Standard icons
    icon_192 = create_pwa_icon(192, is_maskable=False)
    icon_192.save(os.path.join(icons_dir, 'icon-192x192.png'), 'PNG')
    
    icon_512 = create_pwa_icon(512, is_maskable=False)
    icon_512.save(os.path.join(icons_dir, 'icon-512x512.png'), 'PNG')
    
    # Maskable icons
    mask_192 = create_pwa_icon(192, is_maskable=True)
    mask_192.save(os.path.join(icons_dir, 'icon-maskable-192x192.png'), 'PNG')
    
    mask_512 = create_pwa_icon(512, is_maskable=True)
    mask_512.save(os.path.join(icons_dir, 'icon-maskable-512x512.png'), 'PNG')
    
    # Apple touch icon (180x180)
    apple_180 = create_pwa_icon(180, is_maskable=True)
    apple_180.save(os.path.join(icons_dir, 'apple-touch-icon.png'), 'PNG')
    
    # Android status bar badge (72x72)
    badge_72 = create_badge_icon(72)
    badge_72.save(os.path.join(icons_dir, 'badge-72x72.png'), 'PNG')
    
    print("Successfully generated all PWA icons in public/icons/!")

if __name__ == '__main__':
    main()
