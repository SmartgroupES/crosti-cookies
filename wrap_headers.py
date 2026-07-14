import re

with open('dashboard-admin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to find <div class="chart-card ..."> and its inner contents up to <div class="data-table-wrap
# But HTML parsing with regex can be tricky. Let's try to just use BeautifulSoup.

from bs4 import BeautifulSoup

soup = BeautifulSoup(content, 'html.parser')

cards = soup.find_all('div', class_='chart-card')

for card in cards:
    # We want to wrap all children that come BEFORE the first element containing 'data-table-wrap' class
    # or before the first table if no data-table-wrap exists.
    
    wrap = soup.new_tag('div')
    wrap['class'] = 'chart-sticky-top'
    
    children_to_move = []
    has_table = False
    
    for child in card.children:
        if child.name == 'div' and child.has_attr('class') and 'data-table-wrap' in child['class']:
            has_table = True
            break
        # also break if it's directly a table or something else huge
        if child.name == 'table':
            has_table = True
            break
        children_to_move.append(child)
        
    if has_table and len(children_to_move) > 0:
        # Move them to wrapper
        for child in children_to_move:
            wrap.append(child.extract())
        
        card.insert(0, wrap)

with open('dashboard-admin.html', 'w', encoding='utf-8') as f:
    f.write(str(soup))

print("Modified dashboard-admin.html successfully")
