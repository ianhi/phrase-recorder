# Bangla Voice Recorder

A web-based application for recording and managing Bangla audio pronunciations with automatic trimming, waveform visualization, and Anki export capabilities.

## Features

- 🎤 **High-quality audio recording** with automatic silence trimming
- 📊 **Interactive waveform visualization** for precise audio editing
- 🎯 **Progress tracking** with session statistics
- 📦 **Anki package export** with ready-to-use templates
- ⌨️ **Keyboard shortcuts** for efficient workflow
- 📱 **Responsive design** for desktop and mobile
- 💾 **Local storage** with IndexedDB for offline capability
- 🔧 **Customizable settings** for recording preferences

## Demo

Try the live demo: [Bangla Voice Recorder](https://your-username.github.io/bangla-recorder)

## Quick Start

### Option 1: Run Locally

#### Prerequisites

- Node.js 18+ and npm
- Modern web browser with microphone access

#### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/your-username/bangla-recorder.git
   cd bangla-recorder
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Open your browser**
   \`\`\`
   http://localhost:3000
   \`\`\`

5. **Grant microphone permissions** when prompted

#### Available Scripts

\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
\`\`\`

### Option 2: Deploy to GitHub Pages

#### Method 1: Automatic Deployment (Recommended)

1. **Fork this repository** to your GitHub account

2. **Enable GitHub Pages**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Set source to "GitHub Actions"

3. **Configure the deployment**
   - The repository includes a pre-configured GitHub Actions workflow
   - Push any changes to trigger automatic deployment
   - Your app will be available at: `https://your-username.github.io/bangla-recorder`

#### Method 2: Manual Deployment

1. **Clone and setup**
   \`\`\`bash
   git clone https://github.com/your-username/bangla-recorder.git
   cd bangla-recorder
   npm install
   \`\`\`

2. **Build for production**
   \`\`\`bash
   npm run build
   \`\`\`

3. **Deploy to GitHub Pages**
   \`\`\`bash
   npm install -g gh-pages
   npm run deploy
   \`\`\`

## Usage Guide

### Getting Started

1. **Choose your word list**
   - Use the demo with 15 common Bangla phrases, or
   - Upload your own CSV file with custom words

2. **CSV Format**
   \`\`\`csv
   id,bangla,english
   bn_001,আমি ভালো আছি,I am fine
   bn_002,ধন্যবাদ,Thank you
   bn_003,আপনার নাম কি?,What is your name?
   \`\`\`

3. **Start recording**
   - Click "Start Recording" or press `R`
   - Speak clearly into your microphone
   - Click "Stop Recording" or press `R` again

4. **Review and save**
   - Audio is automatically trimmed to remove silence
   - Play back to verify quality
   - Click "Save & Next" or press `Enter`

### Keyboard Shortcuts

| Action | Shortcut | Context |
|--------|----------|---------|
| Record/Stop | `R` | Always |
| Play/Pause | `Space` | When audio exists |
| Save & Next | `Enter` | When audio exists |
| Skip Word | `S` | Always |
| Re-record | `Backspace` | When audio exists |
| Settings | `Ctrl+,` | Always |
| Progress | `Ctrl+P` | Always |

### Export Options

#### Anki Package (Recommended)
- Complete package with audio files, templates, and instructions
- Ready-to-import CSV with proper formatting
- Detailed setup guide included

#### Audio Files Only
- ZIP file with just the WAV audio files
- For use with other flashcard apps or custom setups

## Configuration

### Audio Settings

- **Auto-play**: Automatically play recordings after processing
- **Auto-trim**: Remove silence from start and end of recordings
- **Auto-download**: Download individual files when saving
- **Auto-record**: Automatically start recording the next word

### Quality Settings

- **Sample Rate**: 44.1 kHz for high quality
- **Format**: WAV (16-bit PCM) for maximum compatibility
- **Channels**: Mono to reduce file size
- **Validation**: Automatic quality checks for all recordings

## Technical Details

### Built With

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern UI components
- **Web Audio API** - High-quality audio processing
- **IndexedDB** - Local data storage
- **Canvas API** - Waveform visualization

### Browser Compatibility

- Chrome 88+ (recommended)
- Firefox 85+
- Safari 14+
- Edge 88+

**Note**: Microphone access requires HTTPS in production

### File Structure

\`\`\`
bangla-recorder/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── audio-uploader.tsx
│   ├── recording-controls.tsx
│   ├── waveform-*.tsx    # Waveform components
│   └── ...
├── hooks/                # Custom React hooks
│   ├── use-audio-recording.ts
│   ├── use-database.ts
│   └── ...
├── lib/                  # Utility libraries
│   ├── audio-utils.ts    # Audio processing
│   ├── audio-package.ts  # Export functionality
│   └── database.ts       # IndexedDB wrapper
├── types/                # TypeScript definitions
└── constants/            # App constants and demo data
\`\`\`

## Deployment Configuration

### GitHub Actions Workflow

The repository includes a pre-configured workflow (`.github/workflows/deploy.yml`):

\`\`\`yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./out
\`\`\`

### Next.js Configuration

For GitHub Pages deployment, the app uses static export:

\`\`\`javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  basePath: process.env.NODE_ENV === 'production' ? '/bangla-recorder' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/bangla-recorder/' : '',
}

export default nextConfig
\`\`\`

## Troubleshooting

### Common Issues

**Microphone not working**
- Ensure browser has microphone permissions
- Check if microphone is being used by other applications
- Try refreshing the page and granting permissions again

**Audio not playing**
- Check browser audio settings
- Ensure volume is turned up
- Try a different browser

**Export not working**
- Ensure you have recorded at least one word
- Check browser's download settings
- Try disabling ad blockers temporarily

**App not loading on GitHub Pages**
- Verify the repository name matches the basePath in next.config.mjs
- Check that GitHub Pages is enabled in repository settings
- Ensure the deployment workflow completed successfully

### Performance Tips

- Use Chrome for best performance
- Close other tabs using microphone
- Ensure stable internet connection for initial load
- Clear browser cache if experiencing issues

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: your-email@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/bangla-recorder/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-username/bangla-recorder/discussions)

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Next.js](https://nextjs.org/) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- The Bangla language learning community for inspiration

---

**Happy Recording! 🎤📚**
