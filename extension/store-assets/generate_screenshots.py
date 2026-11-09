import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = r"S:\Computer\Computer Software\Build Apps\Ai Job Seaker\extension\public\store-assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

FONT_REG = r"C:\Windows\Fonts\segoeui.ttf"
FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_SEMIBOLD = r"C:\Windows\Fonts\seguisb.ttf" if os.path.exists(r"C:\Windows\Fonts\seguisb.ttf") else FONT_BOLD

def get_font(size, bold=False):
    fpath = FONT_BOLD if bold else FONT_REG
    try:
        return ImageFont.truetype(fpath, size)
    except:
        return ImageFont.load_default()

def draw_rounded_rect(draw, bbox, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(bbox, radius=radius, fill=fill, outline=outline, width=width)

def draw_gradient_background(width=1280, height=800):
    img = Image.new("RGB", (width, height), (11, 15, 25))
    draw = ImageDraw.Draw(img)
    # Subtle top-center radial/vertical gradient glow
    for y in range(height):
        ratio = y / height
        # Blend from #151b2e down to #07090e
        r = int(22 * (1 - ratio*0.7) + 7 * (ratio*0.7))
        g = int(27 * (1 - ratio*0.7) + 9 * (ratio*0.7))
        b = int(48 * (1 - ratio*0.7) + 16 * (ratio*0.7))
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return img

def create_screenshot_1():
    img = draw_gradient_background()
    draw = ImageDraw.Draw(img)
    
    # 1. Top Header Banner
    # Tag Pill
    draw_rounded_rect(draw, (510, 28, 770, 56), radius=14, fill=(30, 27, 75), outline=(99, 102, 241), width=1)
    draw.text((534, 34), "⚡ 1-CLICK SMART AUTOFILL", fill=(165, 180, 252), font=get_font(13, bold=True))
    
    # Main Title
    draw.text((250, 68), "Apply 10x Faster on LinkedIn, Indeed & Greenhouse", fill=(255, 255, 255), font=get_font(30, bold=True))
    draw.text((290, 110), "AI Job Seeker instantly detects and populates repetitive job forms with verified profile data.", fill=(148, 163, 184), font=get_font(15))
    
    # 2. Main Workspace Layout (Browser on left, Extension Popup on right)
    # Left: Web Browser Window Mockup
    b_x1, b_y1, b_x2, b_y2 = 48, 152, 790, 755
    draw_rounded_rect(draw, (b_x1, b_y1, b_x2, b_y2), radius=12, fill=(15, 23, 42), outline=(51, 65, 85), width=1)
    
    # Browser top bar
    draw_rounded_rect(draw, (b_x1, b_y1, b_x2, b_y1 + 42), radius=12, fill=(30, 41, 59))
    draw.rectangle((b_x1, b_y1 + 30, b_x2, b_y1 + 42), fill=(30, 41, 59)) # square bottom corners
    draw.line([(b_x1, b_y1 + 42), (b_x2, b_y1 + 42)], fill=(51, 65, 85), width=1)
    
    # Window controls
    draw.ellipse((b_x1 + 16, b_y1 + 16, b_x1 + 26, b_y1 + 26), fill=(239, 68, 68))
    draw.ellipse((b_x1 + 34, b_y1 + 16, b_x1 + 44, b_y1 + 26), fill=(234, 179, 8))
    draw.ellipse((b_x1 + 52, b_y1 + 16, b_x1 + 62, b_y1 + 26), fill=(34, 197, 94))
    
    # URL bar
    draw_rounded_rect(draw, (b_x1 + 78, b_y1 + 8, b_x2 - 16, b_y1 + 34), radius=6, fill=(15, 23, 42))
    draw.text((b_x1 + 92, b_y1 + 12), "🔒 boards.greenhouse.io/cloudscale-technologies/jobs/491029", fill=(56, 189, 248), font=get_font(12))
    
    # Inside Browser: Job Posting Header
    draw.text((b_x1 + 28, b_y1 + 60), "Senior Full Stack Engineer", fill=(248, 250, 252), font=get_font(20, bold=True))
    draw.text((b_x1 + 28, b_y1 + 88), "CloudScale Technologies  •  San Francisco, CA (Remote Friendly)", fill=(100, 116, 139), font=get_font(13))
    draw.line([(b_x1 + 28, b_y1 + 115), (b_x2 - 28, b_y1 + 115)], fill=(30, 41, 59), width=1)
    
    # Form Fields Grid (Simulating populated fields)
    fields = [
        ("FIRST NAME", "Mujib", 0, 0),
        ("LAST NAME", "Ur Rahman", 1, 0),
        ("EMAIL ADDRESS", "mujiburrahman.dev@gmail.com", 0, 1),
        ("PHONE NUMBER", "+92 348 1974606", 1, 1),
        ("LINKEDIN PROFILE", "https://linkedin.com/in/mujib-dev", 0, 2, True),
        ("GITHUB / PORTFOLIO", "https://github.com/Mujib-dev", 0, 3),
        ("YEARS OF EXPERIENCE", "5+ Years", 1, 3),
        ("WORK AUTHORIZATION", "Legally Authorized / Immediate", 0, 4),
        ("DESIRED SALARY", "Market Competitive ($120k+)", 1, 4),
    ]
    
    grid_start_y = b_y1 + 130
    col_w = (b_x2 - b_x1 - 56 - 16) // 2
    
    for f in fields:
        label = f[0]
        val = f[1]
        col = f[2]
        row = f[3]
        span2 = len(f) > 4 and f[4]
        
        fx = b_x1 + 28 + col * (col_w + 16)
        fy = grid_start_y + row * 66
        fw = (col_w * 2 + 16) if span2 else col_w
        
        # Field box
        draw_rounded_rect(draw, (fx, fy, fx + fw, fy + 52), radius=8, fill=(30, 41, 59), outline=(16, 185, 129), width=1)
        # Filled Pill
        draw_rounded_rect(draw, (fx + fw - 58, fy - 7, fx + fw - 8, fy + 11), radius=4, fill=(16, 185, 129))
        draw.text((fx + fw - 52, fy - 5), "FILLED", fill=(6, 78, 59), font=get_font(9, bold=True))
        
        draw.text((fx + 12, fy + 7), label, fill=(148, 163, 184), font=get_font(10, bold=True))
        draw.text((fx + 12, fy + 25), val, fill=(241, 245, 249), font=get_font(13))
        draw.text((fx + fw - 22, fy + 24), "✓", fill=(16, 185, 129), font=get_font(14, bold=True))

    # Right: Extension Popup Mockup
    p_x1, p_y1, p_x2, p_y2 = 824, 152, 1232, 755
    draw_rounded_rect(draw, (p_x1, p_y1, p_x2, p_y2), radius=16, fill=(17, 24, 39), outline=(99, 102, 241), width=2)
    
    # Popup Header
    draw_rounded_rect(draw, (p_x1 + 20, p_y1 + 18, p_x1 + 54, p_y1 + 52), radius=8, fill=(79, 70, 229))
    draw.text((p_x1 + 28, p_y1 + 22), "⚡", fill=(255, 255, 255), font=get_font(20))
    draw.text((p_x1 + 64, p_y1 + 23), "AI Job Seeker", fill=(255, 255, 255), font=get_font(18, bold=True))
    draw.text((p_x1 + 64, p_y1 + 44), "by LynkZone", fill=(148, 163, 184), font=get_font(11))
    
    # Pro Active badge
    draw_rounded_rect(draw, (p_x2 - 100, p_y1 + 24, p_x2 - 20, p_y1 + 48), radius=6, fill=(245, 158, 11))
    draw.text((p_x2 - 92, p_y1 + 28), "PRO ACTIVE", fill=(0, 0, 0), font=get_font(10, bold=True))
    
    draw.line([(p_x1 + 20, p_y1 + 68), (p_x2 - 20, p_y1 + 68)], fill=(31, 41, 55), width=1)
    
    # Profile Card
    draw_rounded_rect(draw, (p_x1 + 20, p_y1 + 84, p_x2 - 20, p_y1 + 154), radius=10, fill=(31, 41, 55))
    draw.ellipse((p_x1 + 34, p_y1 + 96, p_x1 + 78, p_y1 + 140), fill=(55, 65, 81), outline=(99, 102, 241), width=2)
    draw.text((p_x1 + 45, p_y1 + 106), "MR", fill=(165, 180, 252), font=get_font(16, bold=True))
    draw.text((p_x1 + 92, p_y1 + 98), "Mujib Ur Rahman", fill=(255, 255, 255), font=get_font(15, bold=True))
    draw.text((p_x1 + 92, p_y1 + 120), "Full Stack Engineer  •  1-Click Active", fill=(156, 163, 175), font=get_font(12))
    
    # Detection Alert
    draw_rounded_rect(draw, (p_x1 + 20, p_y1 + 170, p_x2 - 20, p_y1 + 224), radius=8, fill=(6, 78, 59), outline=(16, 185, 129), width=1)
    draw.text((p_x1 + 32, p_y1 + 184), "✓  Ready:", fill=(52, 211, 153), font=get_font(13, bold=True))
    draw.text((p_x1 + 104, p_y1 + 184), "18 Form Inputs Auto-Detected & Populated", fill=(209, 250, 229), font=get_font(12))
    
    # Primary Action Button
    draw_rounded_rect(draw, (p_x1 + 20, p_y1 + 242, p_x2 - 20, p_y1 + 300), radius=10, fill=(79, 70, 229))
    draw.text((p_x1 + 100, p_y1 + 258), "⚡ 1-Click Smart Autofill (Applied)", fill=(255, 255, 255), font=get_font(14, bold=True))
    
    # Feature Bullet Points
    bullets = [
        ("🎯", "Instant autofill on LinkedIn, Indeed & Greenhouse"),
        ("🤖", "Tailored AI cover letter & custom answer generator"),
        ("📊", "Automatic application tracking & interview pipeline"),
        ("🔒", "100% Privacy-First: All profile data kept on device"),
    ]
    by = p_y1 + 324
    for b in bullets:
        draw_rounded_rect(draw, (p_x1 + 20, by, p_x2 - 20, by + 46), radius=8, fill=(31, 41, 55))
        draw.text((p_x1 + 32, by + 12), b[0], font=get_font(14))
        draw.text((p_x1 + 58, by + 14), b[1], fill=(229, 231, 235), font=get_font(12))
        by += 54
        
    out_path = os.path.join(ASSETS_DIR, "screenshot-1-autofill.png")
    img.save(out_path, "PNG")
    print(f"Saved {out_path} ({img.size})")

def create_screenshot_2():
    img = draw_gradient_background()
    draw = ImageDraw.Draw(img)
    
    # Top Banner
    draw_rounded_rect(draw, (490, 28, 790, 56), radius=14, fill=(59, 7, 100), outline=(168, 85, 247), width=1)
    draw.text((510, 34), "🤖 AI QUESTION COPILOT & ATS LETTERS", fill=(216, 180, 254), font=get_font(13, bold=True))
    
    draw.text((270, 68), "Pass Every Hiring Filter with Targeted AI Responses", fill=(255, 255, 255), font=get_font(30, bold=True))
    draw.text((310, 110), "Contextual answers to tricky recruiter questions & ATS-optimized cover letters tailored to every job.", fill=(148, 163, 184), font=get_font(15))
    
    # 2 Panels Side by Side
    # Left Panel: AI Question Assistant
    p1_x1, p1_y1, p1_x2, p1_y2 = 48, 152, 626, 755
    draw_rounded_rect(draw, (p1_x1, p1_y1, p1_x2, p1_y2), radius=14, fill=(15, 23, 42), outline=(51, 65, 85), width=1)
    
    draw.text((p1_x1 + 24, p1_y1 + 24), "💡 AI Recruiter Question Assistant", fill=(248, 250, 252), font=get_font(18, bold=True))
    draw.line([(p1_x1 + 24, p1_y1 + 56), (p1_x2 - 24, p1_y1 + 56)], fill=(30, 41, 59), width=1)
    
    # Question Card 1
    draw_rounded_rect(draw, (p1_x1 + 24, p1_y1 + 72, p1_x2 - 24, p1_y1 + 265), radius=10, fill=(30, 41, 59), outline=(51, 65, 85), width=1)
    draw.text((p1_x1 + 38, p1_y1 + 86), "Q: Why do you want to work at CloudScale Technologies?", fill=(56, 189, 248), font=get_font(13, bold=True))
    
    draw_rounded_rect(draw, (p1_x1 + 38, p1_y1 + 112, p1_x2 - 38, p1_y1 + 218), radius=6, fill=(15, 23, 42))
    draw.rectangle((p1_x1 + 38, p1_y1 + 112, p1_x1 + 42, p1_y1 + 218), fill=(168, 85, 247))
    q1_text = (
        "\"With 5+ years building high-throughput React, TypeScript, and Node.js systems, I have closely\n"
        "followed CloudScale's innovations in distributed developer infrastructure. My background optimizing\n"
        "microservices directly aligns with your team's mission to eliminate developer latency.\""
    )
    draw.text((p1_x1 + 52, p1_y1 + 124), q1_text, fill=(203, 213, 225), font=get_font(12))
    
    draw_rounded_rect(draw, (p1_x2 - 240, p1_y1 + 226, p1_x2 - 38, p1_y1 + 256), radius=6, fill=(147, 51, 234))
    draw.text((p1_x2 - 228, p1_y1 + 233), "✨ Insert into Application (1-Click)", fill=(255, 255, 255), font=get_font(11, bold=True))
    
    # Question Card 2
    draw_rounded_rect(draw, (p1_x1 + 24, p1_y1 + 285, p1_x2 - 24, p1_y1 + 478), radius=10, fill=(30, 41, 59), outline=(51, 65, 85), width=1)
    draw.text((p1_x1 + 38, p1_y1 + 299), "Q: Describe a challenging technical conflict and how you resolved it.", fill=(56, 189, 248), font=get_font(13, bold=True))
    
    draw_rounded_rect(draw, (p1_x1 + 38, p1_y1 + 325, p1_x2 - 38, p1_y1 + 431), radius=6, fill=(15, 23, 42))
    draw.rectangle((p1_x1 + 38, p1_y1 + 325, p1_x1 + 42, p1_y1 + 431), fill=(168, 85, 247))
    q2_text = (
        "\"During a major API migration, backend engineers debated synchronous vs event-driven pipelines.\n"
        "I orchestrated isolated load tests demonstrating that asynchronous Redis streaming reduced peak\n"
        "latency by 42%. By grounding our decision in empirical metrics, we reached unified team consensus.\""
    )
    draw.text((p1_x1 + 52, p1_y1 + 337), q2_text, fill=(203, 213, 225), font=get_font(12))
    
    draw_rounded_rect(draw, (p1_x2 - 240, p1_y1 + 439, p1_x2 - 38, p1_y1 + 469), radius=6, fill=(147, 51, 234))
    draw.text((p1_x2 - 228, p1_y1 + 446), "✨ Insert into Application (1-Click)", fill=(255, 255, 255), font=get_font(11, bold=True))

    # Right Panel: Targeted Cover Letter Generator
    p2_x1, p2_y1, p2_x2, p2_y2 = 654, 152, 1232, 755
    draw_rounded_rect(draw, (p2_x1, p2_y1, p2_x2, p2_y2), radius=14, fill=(15, 23, 42), outline=(51, 65, 85), width=1)
    
    draw.text((p2_x1 + 24, p2_y1 + 24), "📄 Targeted ATS Cover Letter Generator", fill=(248, 250, 252), font=get_font(18, bold=True))
    draw.line([(p2_x1 + 24, p2_y1 + 56), (p2_x2 - 24, p2_y1 + 56)], fill=(30, 41, 59), width=1)
    
    draw_rounded_rect(draw, (p2_x1 + 24, p2_y1 + 72, p2_x2 - 24, p2_y1 + 104), radius=6, fill=(30, 41, 59))
    draw.text((p2_x1 + 36, p2_y1 + 80), "🎯 Tailored for: Senior Full Stack Engineer (CloudScale Technologies)", fill=(165, 180, 252), font=get_font(12, bold=True))
    
    # Letter Box
    draw_rounded_rect(draw, (p2_x1 + 24, p2_y1 + 118, p2_x2 - 24, p2_y1 + 500), radius=10, fill=(15, 23, 42), outline=(51, 65, 85), width=1)
    letter_text = (
        "Dear Hiring Team at CloudScale Technologies,\n\n"
        "I am writing to express my strong enthusiasm for the Senior Full Stack Engineer role at CloudScale.\n"
        "With an extensive track record designing scalable web applications, robust TypeScript architectures,\n"
        "and high-efficiency cloud APIs, I am excited about the opportunity to contribute to your engineering team.\n\n"
        "Key highlights I bring to CloudScale:\n"
        "• Scaled cloud backends handling over 2M+ monthly active requests with 99.98% uptime.\n"
        "• Architected automated continuous integration workflows reducing release delivery cycles by 35%.\n"
        "• Pioneered reusable design system components adopted across multi-disciplinary product squads.\n\n"
        "Thank you for considering my application. I look forward to the possibility of discussing how my experience\n"
        "can accelerate your key technical initiatives.\n\n"
        "Sincerely,\nMujib Ur Rahman"
    )
    draw.text((p2_x1 + 42, p2_y1 + 136), letter_text, fill=(203, 213, 225), font=get_font(12))
    
    # Bottom Buttons
    draw_rounded_rect(draw, (p2_x1 + 24, p2_y1 + 516, p2_x1 + 280, p2_y1 + 566), radius=8, fill=(79, 70, 229))
    draw.text((p2_x1 + 75, p2_y1 + 532), "📋 Copy Letter to Clipboard", fill=(255, 255, 255), font=get_font(13, bold=True))
    
    draw_rounded_rect(draw, (p2_x1 + 296, p2_y1 + 516, p2_x2 - 24, p2_y1 + 566), radius=8, fill=(30, 41, 59), outline=(51, 65, 85), width=1)
    draw.text((p2_x1 + 360, p2_y1 + 532), "✨ Regenerate Tailored Letter", fill=(148, 163, 184), font=get_font(13, bold=True))

    out_path = os.path.join(ASSETS_DIR, "screenshot-2-ai-copilot.png")
    img.save(out_path, "PNG")
    print(f"Saved {out_path} ({img.size})")

def create_screenshot_3():
    img = draw_gradient_background()
    draw = ImageDraw.Draw(img)
    
    # Top Banner
    draw_rounded_rect(draw, (490, 28, 790, 56), radius=14, fill=(6, 78, 59), outline=(16, 185, 129), width=1)
    draw.text((516, 34), "📊 APPLICATION TRACKER & PIPELINE", fill=(110, 231, 183), font=get_font(13, bold=True))
    
    draw.text((270, 68), "Track Every Application & Interview in One Hub", fill=(255, 255, 255), font=get_font(30, bold=True))
    draw.text((310, 110), "Automatically logs job titles, companies, dates, and statuses as you submit applications across the web.", fill=(148, 163, 184), font=get_font(15))
    
    # Stat Cards Row
    stats = [
        ("48", "APPLICATIONS SENT", (56, 189, 248)),
        ("6", "INTERVIEWS SCHEDULED", (192, 132, 252)),
        ("2", "OFFERS RECEIVED", (74, 222, 128)),
        ("18 hrs", "TYPING TIME SAVED", (251, 191, 36)),
    ]
    
    sc_w = (1280 - 96 - 48) // 4
    for idx, (num, label, color) in enumerate(stats):
        sx = 48 + idx * (sc_w + 16)
        sy = 152
        draw_rounded_rect(draw, (sx, sy, sx + sc_w, sy + 88), radius=12, fill=(15, 23, 42), outline=(51, 65, 85), width=1)
        draw.text((sx + 20, sy + 14), num, fill=color, font=get_font(26, bold=True))
        draw.text((sx + 20, sy + 54), label, fill=(148, 163, 184), font=get_font(11, bold=True))
        
    # Table Box
    t_x1, t_y1, t_x2, t_y2 = 48, 260, 1232, 755
    draw_rounded_rect(draw, (t_x1, t_y1, t_x2, t_y2), radius=14, fill=(15, 23, 42), outline=(51, 65, 85), width=1)
    
    # Table Header Row
    draw_rounded_rect(draw, (t_x1, t_y1, t_x2, t_y1 + 46), radius=14, fill=(30, 41, 59))
    draw.rectangle((t_x1, t_y1 + 30, t_x2, t_y1 + 46), fill=(30, 41, 59))
    draw.line([(t_x1, t_y1 + 46), (t_x2, t_y1 + 46)], fill=(51, 65, 85), width=1)
    
    draw.text((t_x1 + 30, t_y1 + 14), "COMPANY", fill=(148, 163, 184), font=get_font(11, bold=True))
    draw.text((t_x1 + 270, t_y1 + 14), "ROLE", fill=(148, 163, 184), font=get_font(11, bold=True))
    draw.text((t_x1 + 590, t_y1 + 14), "PLATFORM", fill=(148, 163, 184), font=get_font(11, bold=True))
    draw.text((t_x1 + 800, t_y1 + 14), "APPLIED DATE", fill=(148, 163, 184), font=get_font(11, bold=True))
    draw.text((t_x1 + 1010, t_y1 + 14), "PIPELINE STATUS", fill=(148, 163, 184), font=get_font(11, bold=True))
    
    rows = [
        ("G", (59, 130, 246), "Google", "Senior Frontend Engineer", "Google Careers", "Today, 2:15 PM", "Interviewing", (168, 85, 247), (216, 180, 254)),
        ("M", (16, 185, 129), "Microsoft", "Full Stack Cloud Architect", "LinkedIn Easy Apply", "Yesterday", "Technical Screen", (168, 85, 247), (216, 180, 254)),
        ("A", (245, 158, 11), "Amazon Web Services", "Software Engineer II", "Amazon Jobs", "3 days ago", "Offer Stage", (34, 197, 94), (110, 231, 183)),
        ("C", (99, 102, 241), "CloudScale Tech", "Senior Full Stack Engineer", "Greenhouse.io", "4 days ago", "Applied", (59, 130, 246), (147, 197, 253)),
        ("S", (236, 72, 153), "Stripe", "Senior Backend Platform Engineer", "Lever.co", "5 days ago", "Interviewing", (168, 85, 247), (216, 180, 254)),
        ("N", (239, 68, 68), "Netflix", "Senior Distributed Systems Engineer", "Workday", "1 week ago", "Applied", (59, 130, 246), (147, 197, 253)),
    ]
    
    ry = t_y1 + 56
    for initial, icon_bg, company, role, platform, date, status, bg_col, text_col in rows:
        # Initial Circle
        draw.ellipse((t_x1 + 30, ry + 8, t_x1 + 66, ry + 44), fill=icon_bg)
        draw.text((t_x1 + 42, ry + 15), initial, fill=(255, 255, 255), font=get_font(15, bold=True))
        
        draw.text((t_x1 + 78, ry + 17), company, fill=(255, 255, 255), font=get_font(14, bold=True))
        draw.text((t_x1 + 270, ry + 17), role, fill=(226, 232, 240), font=get_font(13))
        draw.text((t_x1 + 590, ry + 17), platform, fill=(148, 163, 184), font=get_font(13))
        draw.text((t_x1 + 800, ry + 17), date, fill=(148, 163, 184), font=get_font(13))
        
        # Status Pill
        draw_rounded_rect(draw, (t_x1 + 1004, ry + 12, t_x1 + 1146, ry + 40), radius=14, fill=(15, 23, 42), outline=bg_col, width=1)
        draw.text((t_x1 + 1024, ry + 17), status, fill=text_col, font=get_font(11, bold=True))
        
        draw.line([(t_x1 + 20, ry + 56), (t_x2 - 20, ry + 56)], fill=(30, 41, 59), width=1)
        ry += 66

    out_path = os.path.join(ASSETS_DIR, "screenshot-3-tracker.png")
    img.save(out_path, "PNG")
    print(f"Saved {out_path} ({img.size})")

if __name__ == "__main__":
    create_screenshot_1()
    create_screenshot_2()
    create_screenshot_3()
