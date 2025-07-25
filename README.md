# Clynzer - AI-Powered Accessibility Scanner

Clynzer is a comprehensive accessibility scanning platform that helps ensure your websites meet WCAG compliance standards. Powered by advanced AI technology, Clynzer provides detailed accessibility reports and actionable fix recommendations.

## ✨ Features

### 🔍 **Advanced Accessibility Scanning**
- Complete WCAG 2.1 AA compliance checking
- Real-time scanning of any public website
- Detailed violation reports with severity levels
- Integration with axe-core accessibility engine

### 🤖 **AI-Powered Fix Recommendations**
- GPT-4 powered intelligent fix suggestions
- Step-by-step implementation guides
- Code examples and best practices
- Context-aware recommendations

### 📊 **Professional Reporting**
- PDF report generation with professional formatting
- Comprehensive scan summaries and metrics
- Exportable results for compliance documentation
- Branded reports with Clynzer styling

### 📅 **Scheduled Monitoring**
- Automated weekly accessibility scans
- Email alerts with PDF reports attached
- GitHub Actions integration for CI/CD
- Bulk scanning for multiple URLs

### 💳 **Stripe Payment Integration**
- Flexible subscription plans
- Secure payment processing
- Webhook integration for automated billing
- Pro features and usage tracking

### 🔐 **User Authentication**
- Clerk-powered secure authentication
- User profiles and preferences
- Role-based access control
- OAuth integration support

### 🎨 **Modern UI/UX**
- Dark mode support
- Responsive design for all devices
- Real-time scanning progress
- Interactive dashboard with charts

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DarylOkeke/clynzer.git
   cd clynzer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Copy `.env.local.example` to `.env.local` and configure:
   ```bash
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   
   # OpenAI Configuration
   OPENAI_API_KEY=sk-proj-...
   
   # Stripe Configuration
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   
   # SendGrid Email
   SENDGRID_API_KEY=SG....
   SENDGRID_FROM_EMAIL=reports@clynzer.com
   
   # App Configuration
   NEXT_PUBLIC_BASE_URL=https://clynzer.com
   SCHEDULED_SCAN_API_KEY=your_secure_key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## 📖 Usage

### Basic Scanning
1. Enter any website URL in the scanner input
2. Toggle AI-powered fixes if desired
3. Click "Scan Website" to start analysis
4. Review violations and AI recommendations
5. Generate PDF reports for documentation

### Scheduled Scans
1. Configure user URLs in the admin panel
2. Set up GitHub Actions with required secrets
3. Automated scans run every Monday at 9 AM UTC
4. Users receive email reports with PDF attachments

### API Endpoints

- `POST /api/scan` - Perform accessibility scan
- `POST /api/report` - Generate PDF report
- `GET /api/users/scan-list` - Get scheduled scan users
- `POST /api/email/send-report` - Send email reports

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Authentication**: Clerk for secure user management
- **Payments**: Stripe for subscription handling
- **AI**: OpenAI GPT-4 for intelligent recommendations
- **Accessibility**: axe-core for comprehensive scanning
- **Email**: SendGrid for automated reporting
- **PDF**: pdf-lib for professional report generation
- **Charts**: Recharts for data visualization
- **CI/CD**: GitHub Actions for scheduled scanning

## 📁 Project Structure

```
clynzer/
├── pages/                    # Next.js pages and API routes
│   ├── api/                 # Backend API endpoints
│   │   ├── scan.ts         # Accessibility scanning
│   │   ├── report.ts       # PDF generation
│   │   └── email/          # Email services
│   ├── index.tsx           # Main scanner interface
│   ├── dashboard.tsx       # User dashboard
│   ├── pricing.tsx         # Subscription plans
│   └── sign-in.tsx         # Authentication pages
├── lib/                     # Utility libraries
│   └── openai.ts           # AI integration
├── styles/                  # Global styles
├── scripts/                 # Automation scripts
│   └── scheduled-scans.js  # Weekly scan automation
├── .github/workflows/       # GitHub Actions
│   └── schedule-scans.yml  # Scheduled scanning workflow
└── logs/                   # Scan logs and results
```

## 🔧 Configuration

### Environment Variables
All configuration is handled through environment variables. See `.env.local` for required variables.

### GitHub Actions Setup
For automated scanning, configure these secrets in your GitHub repository:
- `NEXT_PUBLIC_BASE_URL`
- `OPENAI_API_KEY`
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `CLERK_SECRET_KEY`
- `SCHEDULED_SCAN_API_KEY`

### Email Configuration
Set up SendGrid with your domain and configure DNS records for email delivery.

## 📊 Features in Detail

### Accessibility Scanning
- **Comprehensive**: Tests against WCAG 2.1 AA standards
- **Fast**: Scans complete in seconds
- **Accurate**: Powered by industry-standard axe-core
- **Detailed**: Provides specific element violations

### AI Recommendations
- **Intelligent**: Context-aware fix suggestions
- **Actionable**: Step-by-step implementation guides
- **Code Examples**: Ready-to-use code snippets
- **Best Practices**: Industry-standard solutions

### Professional Reports
- **PDF Generation**: High-quality, branded reports
- **Comprehensive**: Includes all violations and fixes
- **Exportable**: Perfect for compliance documentation
- **Customizable**: Branded with Clynzer styling

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines and submit pull requests for any improvements.

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🆘 Support

For support, email support@clynzer.com or create an issue in this repository.

## 🔮 Roadmap

- [ ] Multi-language support
- [ ] Advanced scheduling options
- [ ] Team collaboration features
- [ ] API rate limiting improvements
- [ ] Custom branding for reports
- [ ] Integration with popular CMS platforms
- [ ] Mobile app development
- [ ] Advanced analytics dashboard

---

**Clynzer** - Making the web accessible for everyone. 🌐♿
