import re

with open('dashboard-admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove VAL-01 store card block
content = re.sub(
    r'<!-- VAL-01 -->\s*<div class="tienda-card">\s*<div class="tienda-card-header valencia">.*?</div>\s*</div>\s*</div>',
    '</div>', 
    content, flags=re.DOTALL
)

# 2. Remove VAL-01 timeline block
content = re.sub(
    r'<div class="tl-item">\s*<div class="tl-dot next"></div>\s*<div class="tl-date">Q2 2027 — JUNIO</div>\s*<div class="tl-title">VAL-01 — Valencia · Zona Comercial</div>\s*<div class="tl-desc">.*?</div>\s*<span class="tl-chip tl-chip-orange">.*?</span>\s*</div>',
    '', 
    content, flags=re.DOTALL
)

# 3. Remove any <option> tags with VAL-01
content = re.sub(r'<option[^>]*value="VAL-01"[^>]*>.*?</option>\n?', '', content)

# 4. Remove from JavaScript arrays
content = re.sub(r"\{\s*id_tienda:\s*'VAL-01'.*?\},?\n?", '', content)

# 5. Make BCN-00 card green
content = content.replace(
    '<div class="tienda-card-header obrador">',
    '<div class="tienda-card-header obrador" style="background:var(--success-color, #10b981); color:white; border-bottom-color:#047857;">'
)
content = content.replace(
    '<div class="tienda-id">BCN-00</div>',
    '<div class="tienda-id" style="color:white; opacity:0.9;">BCN-00</div>'
)

with open('dashboard-admin.html', 'w', encoding='utf-8') as f:
    f.write(content)
