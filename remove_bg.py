from PIL import Image

img = Image.open('logo/stich_logo.png').convert('RGBA')
data = img.getdata()

new_data = []
for r, g, b, a in data:
    # Quitar píxeles blancos y casi blancos (fondo)
    if r > 230 and g > 230 and b > 230:
        new_data.append((r, g, b, 0))  # transparente
    else:
        new_data.append((r, g, b, a))

img.putdata(new_data)
img.save('logo/stich_logo_transparent.png', 'PNG')
print('✅ Listo: logo/stich_logo_transparent.png')
