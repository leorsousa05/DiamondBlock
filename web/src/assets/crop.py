from PIL import Image

# Load the logo
img = Image.open('/home/arch/codes/diamondblock/assets/diamondblock-logo.png')
width, height = img.size

# The height is 375. Let's crop a square on the left: from x=0 to x=375, y=0 to y=375
icon = img.crop((0, 0, height, height))
icon.save('/home/arch/codes/diamondblock/web/public/favicon.png')
icon.save('/home/arch/codes/diamondblock/web/src/assets/diamondblock-icon.png')
print("Successfully cropped logo to square icon.")
