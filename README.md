# 2026 ISS 春酒抽獎系統 Spring Feast Lucky Draw System

A beautiful, interactive lottery/raffle system built with pure HTML, CSS, and Vanilla JavaScript. Designed for the 2026 ISS Spring Feast event with Chinese New Year theming.

## Features

### Core Functionality
- **Spinning Wheel Animation** - Smooth, realistic wheel spin with canvas rendering
- **Weighted Sampling** - Each participant can have multiple tickets (weight) affecting their probability
- **localStorage Persistence** - All data (participants, winners, tickets) persists across browser sessions
- **Multiple Prize Categories** - 10 pre-configured prize tiers from First Prize to Special Prizes

### User Interface
- **Single Viewport Design** - No scrolling needed, everything fits in one screen
- **Bilingual UI** - All text displayed in both Chinese and English
- **Responsive Layout** - Three-column layout with collapsible panels
- **Chinese New Year Theme** - Red and gold color scheme with lantern and horse decorations

### Interactive Features
- **Center Spin Button** - Click the center of the wheel to spin
- **Participant Search** - Filter participants by name
- **Ticket Management** - Add or remove tickets for each participant with +/- buttons
- **Winner Management** - Delete individual winners or clear all records
- **Sound Effects** - Spinning sounds and winning celebration melody

## Project Structure

```
Lucky_draw/
├── index.html          # Main HTML file
├── README.md           # This documentation
├── .gitignore          # Git ignore rules
│
├── assets/             # Static assets
│   ├── favicon.png     # Browser tab icon
│   ├── horse.png       # Horse icon (Year of the Horse)
│   └── lantern.png     # Chinese lantern decoration
│
├── css/
│   └── style.css       # All styling (Spring Festival theme)
│
├── js/
│   └── script.js       # Main application logic
│
└── data/
    └── name.csv        # Participant list (one name per line)
```

## Getting Started

### 1. Prepare Participant List

Edit `data/name.csv` with your participant names:

```csv
Name
Alice
Bob
Charlie
David
...
```

**Note:** The first line is a header and will be skipped. Each subsequent line should contain one participant name.

### 2. Open in Browser

Simply open `index.html` in any modern web browser. No server required for basic usage.

For local development with file serving (recommended):
```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using VS Code Live Server extension
# Right-click index.html → "Open with Live Server"
```

### 3. Start Drawing!

1. Select a prize category from the dropdown
2. Click the **SPIN** button in the center of the wheel
3. When a winner is drawn, choose to **Confirm** or **Redraw**
4. Winners are recorded and displayed in the right panel

## Customization

### Adding/Modifying Prizes

Edit the `<select id="currentPrize">` in `index.html`:

```html
<select id="currentPrize">
    <option value="首獎">首獎 First Prize</option>
    <option value="大獎">大獎 Grand Prize</option>
    <!-- Add more options here -->
</select>
```

Then update `PRIZE_TRANSLATIONS` in `js/script.js`:

```javascript
const PRIZE_TRANSLATIONS = {
    '首獎': 'First Prize',
    '大獎': 'Grand Prize',
    // Add translations for new prizes
};
```

### Changing Colors

Main colors are defined as CSS variables in `css/style.css`:

```css
/* Key color locations */
body {
    background: linear-gradient(135deg, #8B0000 0%, #DC143C 100%);
}

.header {
    background: linear-gradient(90deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
}
```

### Modifying Wheel Colors

Edit the `WHEEL_COLORS` array in `js/script.js`:

```javascript
const WHEEL_COLORS = [
    '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
    '#ff9500', '#ff2d55', '#5856d6', '#00c7be'
];
```

### Adjusting Sound Effects

Sound effects are generated programmatically using Web Audio API. Modify in `js/script.js`:

- `playSpinSound()` - Tick sound during spin
- `playWinSound()` - Celebration melody on winner

## Data Storage

All application state is stored in `localStorage` under the key `iss_spring_feast_2026`:

```javascript
{
    participants: [
        { id: 1, name: "Alice", tickets: 1 },
        { id: 2, name: "Bob", tickets: 2 },
        // ...
    ],
    winners: [
        { id: 1, name: "Alice", prize: "首獎", timestamp: "..." },
        // ...
    ],
    currentPrize: "首獎"
}
```

### Reset Options

- **Reset Participants** - Restores all ticket counts to 1, keeps winners
- **Clear All Winners** - Removes all winner records
- **Full Reset** - Clear browser localStorage or use DevTools

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

**Note:** Requires a modern browser with ES6+ support and localStorage.

## Technical Notes

### No Dependencies
This project intentionally uses no external libraries or frameworks:
- Pure HTML5
- Pure CSS3 (with Flexbox for layout)
- Vanilla JavaScript (ES6+)
- Canvas API for wheel rendering
- Web Audio API for sound effects

### File Size
The entire project is lightweight and can be hosted on any static file server.

## License

This project was created for the 2026 ISS Spring Feast at NTHU (National Tsing Hua University).

---

**Happy Drawing! 祝你好運！** 🎊🧧🎰
