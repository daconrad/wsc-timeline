const timelineContainer = document.getElementById('timeline');
const navContainer = document.getElementById('yearNav');
const riverPath = document.getElementById('river-path');

// Generate Timeline and Navigation
timelineData.forEach((yearData, index) => {
    // 1. Create Navigation Link
    const navLink = document.createElement('a');
    navLink.href = `#year-${yearData.year}`;
    navLink.textContent = yearData.year;
    navLink.onclick = (e) => {
        e.preventDefault();
        const target = document.getElementById(`year-${yearData.year}`);
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Update active class
        document.querySelectorAll('.year-nav a').forEach(a => a.classList.remove('active'));
        navLink.classList.add('active');
    };
    navContainer.appendChild(navLink);

    // 2. Create Timeline Item
    const item = document.createElement('div');
    // Alternate left/right, starting with left
    const positionClass = index % 2 === 0 ? 'left' : 'right';
    item.className = `timeline-item ${positionClass}`;
    item.id = `year-${yearData.year}`;

    let eventsHtml = '';
    yearData.events.forEach(event => {
        eventsHtml += `
            <div class="event">
                <h3>${event.title}</h3>
                <div class="event-body">
                    ${event.image ? `<img src="${event.image}" class="event-image" alt="${event.title}">` : ''}
                    ${event.content ? `<p>${event.content}</p>` : ''}
                </div>
            </div>
        `;
    });

    item.innerHTML = `
        <div class="content">
            <h2>${yearData.year}</h2>
            ${eventsHtml}
        </div>
    `;

    timelineContainer.appendChild(item);
});

// --- River Drawing Logic ---

function drawRiver() {
    const items = document.querySelectorAll('.timeline-item');
    if (items.length === 0) return;

    const containerRect = timelineContainer.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;

    // Identify the X center line
    // Desktop: 50% of container. Mobile: 31px from left.
    const centerX = isMobile ? 31 : containerRect.width / 2;

    // Collect anchor points
    // We want the river to pass through the 'dot' of each item.
    // The dot Y position is relative to the item top + top offset (25px) + radius(8px) -> approx 33px from item top.
    const points = [];

    // Start point (top of container)
    points.push({ x: centerX, y: 0 });

    items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        // Relative Y inside container
        const relativeY = itemRect.top - containerRect.top + 33; // 33 matches dot vertical center
        points.push({ x: centerX, y: relativeY });
    });

    // End point (bottom of container)
    const lastItemY = points[points.length - 1].y;
    points.push({ x: centerX, y: containerRect.height });

    // Generate Path
    // We want a curve that passes through all points, but meanders in between.
    // To 'meander', we can modify the control points or just add random deviations between dots if dots are far apart.
    // However, simplest 'river' look that connects dots is a smooth spline through them with some random 'noise' added to X?
    // Actually, simply using a smooth curve (Cubic Bezier) connecting the dots will look 'wavy' if the dots themselves were offset, but the dots are effectively aligned straight!
    // So a curve through aligned points is... a detailed straight line.

    // SOLUTION: We need to INJECT random waypoints between the aligned dots.

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dy = p2.y - p1.y;

        // Only meander if there's enough space
        if (dy > 50) {
            // Add a random midpoint
            const midY = p1.y + dy / 2;
            // Random offset: -20 to +20 (desktop) or -10 to +10 (mobile)
            const range = isMobile ? 15 : 40;
            const randomOffset = (Math.random() - 0.5) * range * 2;
            const midX = centerX + randomOffset;

            // Curve to midpoint, then curve to p2
            // Uses quadratic bezier (Q) or smooth cubic (S)
            // Lame visualization: Simple quadratic curve to midpoint? 
            // Better: Cubic bezier from p1 to mid, then mid to p2.

            // Control points for first segment (p1 -> mid)
            const cp1x = p1.x;
            const cp1y = p1.y + dy / 4;
            const cp2x = midX;
            const cp2y = midY - dy / 4;

            // Control points for second segment (mid -> p2)
            const cp3x = midX;
            const cp3y = midY + dy / 4;
            const cp4x = p2.x; // Approach p2 straight-ish to hit the dot cleanly? 
            // Actually, if we want to hit the dot (which connects to the line), we should approach p2 near centerX.
            // Let's just create a smooth path.

            d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${midX},${midY}`;
            d += ` S ${cp4x},${p2.y - dy / 4} ${p2.x},${p2.y}`;

        } else {
            // Points too close, just draw line or simple curve
            d += ` L ${p2.x} ${p2.y}`;
        }
    }

    riverPath.setAttribute('d', d);
}

// Initial draw
// We need to wait for layout? 
// window.onload is safer, or explicit call after DOM insertion which we just did.
// But some fonts might shift height.
window.addEventListener('load', drawRiver);
window.addEventListener('resize', () => {
    // Debounce resize
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(drawRiver, 200);
});

// Run once immediately in case load already fired
drawRiver();


// Highlight nav on scroll (Existing logic)
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1 // Lower threshold for better detection
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const year = entry.target.id.replace('year-', '');
            document.querySelectorAll('.year-nav a').forEach(a => {
                a.classList.remove('active');
                if (a.textContent === year) {
                    a.classList.add('active');
                    // Scroll nav into view on mobile
                    if (window.innerWidth <= 768) {
                        a.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                }
            });
        }
    });
}, observerOptions);

document.querySelectorAll('.timeline-item').forEach(item => {
    observer.observe(item);
});
