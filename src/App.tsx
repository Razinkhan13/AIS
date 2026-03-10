import React, { useState, useEffect, useCallback } from "react";
import { 
  FileText, 
  Upload, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  Settings, 
  LogOut, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  FileSearch,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Globe,
  Palette,
  Type as TypeIcon,
  Image as ImageIcon,
  Sun,
  Moon,
  Sparkles,
  Zap,
  Layout,
  Layers,
  RefreshCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDropzone } from "react-dropzone";
import { cn, formatCurrency } from "@/src/lib/utils";
import { extractInvoiceData, extractInvoiceDataFromText, type InvoiceData } from "@/src/services/geminiService";

// --- Types ---

interface AuthState {
  isAuthenticated: boolean;
  tokens: any | null;
}

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-sm",
      secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
      outline: "border border-zinc-200 bg-transparent hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300",
      ghost: "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
      danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
    };
    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base"
    };
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-zinc-200 bg-white/50 dark:bg-zinc-900/50 dark:border-zinc-800 px-4 py-2 text-sm shadow-sm transition-all placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 dark:focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100",
        className
      )}
      {...props}
    />
  )
);

const Label = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <label className={cn("text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.1em] mb-1.5 block", className)}>
    {children}
  </label>
);

// --- Constants ---

const AIS_INFO = {
  name: "Army IBA specialist (AIS)",
  address: "15 mayakanon, khilgaon, Dhaka-1214\nBranch - 1 no Road United housing, pirerbazar, Jalalabad Cantonment, Sylhet-3100.",
  email: "Armyibaspecialist@gmail.com",
  phone: "+8801410761298",
  website: "Armyibaspecialist.info"
};

const THEME_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Blue", value: "#2563eb" },
  { name: "Emerald", value: "#059669" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#d97706" },
];

const FONTS = [
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Playfair", value: "'Playfair Display', serif" },
  { name: "Mono", value: "'JetBrains Mono', monospace" },
  { name: "Montserrat", value: "'Montserrat', sans-serif" },
  { name: "Baskerville", value: "'Libre Baskerville', serif" },
];

// --- Main App ---

export default function App() {
  const [auth, setAuth] = useState<AuthState>({
    isAuthenticated: false,
    tokens: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Customization State
  const [logo, setLogo] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("'Inter', sans-serif");
  const [activeTab, setActiveTab] = useState<'details' | 'design'>('details');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Auth Handlers ---

  const handleConnectDrive = async () => {
    try {
      const response = await fetch("/api/auth/url");
      const { url } = await response.json();
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const authWindow = window.open(
        url,
        "google_auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        alert("Please allow popups for this site to connect your Google Drive.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Failed to initialize Google Auth");
    }
  };

  const openPicker = useCallback(async () => {
    if (!auth.tokens) return;

    const loadPicker = () => {
      return new Promise<void>((resolve) => {
        gapi.load('picker', resolve);
      });
    };

    await loadPicker();

    const picker = new google.picker.PickerBuilder()
      .addView(google.picker.ViewId.DOCS)
      .setOAuthToken(auth.tokens.access_token)
      .setDeveloperKey(import.meta.env.VITE_GOOGLE_API_KEY) // We might need an API key for the picker too
      .setCallback(async (data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          const file = data.docs[0];
          setIsProcessing(true);
          try {
            const response = await fetch("/api/drive/file-content", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileId: file.id, tokens: auth.tokens }),
            });
            const { base64, mimeType } = await response.json();
            await processFile(base64, mimeType);
          } catch (err) {
            console.error("Picker error:", err);
            setError("Failed to fetch file from Drive");
            setIsProcessing(false);
          }
        }
      })
      .build();
    picker.setVisible(true);
  }, [auth.tokens]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setAuth({
          isAuthenticated: true,
          tokens: event.data.tokens,
        });
        localStorage.setItem('ais_invoice_tokens', JSON.stringify(event.data.tokens));
      }
    };
    window.addEventListener('message', handleMessage);
    
    // Check for existing session
    const savedTokens = localStorage.getItem('ais_invoice_tokens');
    if (savedTokens) {
      setAuth({
        isAuthenticated: true,
        tokens: JSON.parse(savedTokens),
      });
    }

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, tokens: null });
    localStorage.removeItem('ais_invoice_tokens');
    setInvoice(null);
  };

  // --- File Processing ---

  const processFile = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await extractInvoiceData(base64, mimeType);
      // Merge with AIS info if sender is empty or generic
      if (!data.sender.name || data.sender.name.toLowerCase().includes("company")) {
        data.sender = {
          ...data.sender,
          name: AIS_INFO.name,
          address: AIS_INFO.address,
          email: AIS_INFO.email,
          phone: AIS_INFO.phone
        };
        if (!data.currency || data.currency === "USD") data.currency = "BDT";
      }
      setInvoice(data);
    } catch (err) {
      console.error("Processing error:", err);
      setError("Failed to extract invoice data. Please try a clearer document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processText = async () => {
    if (!rawText.trim()) return;
    setIsProcessing(true);
    setError(null);
    try {
      const data = await extractInvoiceDataFromText(rawText);
      // Merge with AIS info if sender is empty or generic
      if (!data.sender.name || data.sender.name.toLowerCase().includes("company")) {
        data.sender = {
          ...data.sender,
          name: AIS_INFO.name,
          address: AIS_INFO.address,
          email: AIS_INFO.email,
          phone: AIS_INFO.phone
        };
        if (!data.currency || data.currency === "USD") data.currency = "BDT";
      }
      setInvoice(data);
    } catch (err) {
      console.error("Processing error:", err);
      setError("Failed to extract invoice data from text. Please provide more details.");
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await processFile(base64, file.type);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false
  } as any);

  // --- Invoice Editing ---

  const updateInvoice = (path: string, value: any) => {
    if (!invoice) return;
    const newInvoice = { ...invoice };
    const keys = path.split('.');
    let current: any = newInvoice;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    // Recalculate totals if items change
    if (path.startsWith('items')) {
      const subtotal = newInvoice.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
      newInvoice.subtotal = subtotal;
      newInvoice.taxAmount = subtotal * (newInvoice.taxRate / 100);
      newInvoice.totalAmount = subtotal + newInvoice.taxAmount;
    }
    
    setInvoice(newInvoice);
  };

  const addItem = () => {
    if (!invoice) return;
    const newItem = { description: "", quantity: 1, unitPrice: 0, total: 0 };
    setInvoice({
      ...invoice,
      items: [...invoice.items, newItem]
    });
  };

  const removeItem = (index: number) => {
    if (!invoice) return;
    const newItems = invoice.items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    setInvoice({
      ...invoice,
      items: newItems,
      subtotal,
      taxAmount: subtotal * (invoice.taxRate / 100),
      totalAmount: subtotal + (subtotal * (invoice.taxRate / 100))
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Render Helpers ---

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-20 transition-colors duration-500">
      {/* Header */}
      <header className="sticky top-0 z-50 glass px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center shadow-lg shadow-zinc-900/10 dark:shadow-white/5">
            <FileText className="text-white dark:text-zinc-900 w-5 h-5" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg block leading-none">AIS Invoice Pro</span>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-widest">Army IBA Specialist</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDarkMode(!darkMode)}
            className="w-10 h-10 rounded-xl p-0"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          
          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

          {auth.isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleConnectDrive} className="rounded-xl">
              <Globe className="w-4 h-4 mr-2" />
              Connect Drive
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 print:p-0 print:max-w-none print:m-0">
        <AnimatePresence mode="wait">
          {!invoice && !isProcessing && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="text-center max-w-2xl mx-auto mb-16">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-6"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  AI-Powered Generation
                </motion.div>
                <h2 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6">Create your next invoice</h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">Choose the simplest way to provide your invoice details. Our AI handles the rest.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* File Upload */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  {...getRootProps()} 
                  className={cn(
                    "relative group border-2 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-white dark:bg-zinc-900 overflow-hidden",
                    isDragActive ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800/50" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Layers className="w-24 h-24" />
                  </div>
                  <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Upload Document</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center max-w-[200px]">Drop your PDF, photo, or screenshot here</p>
                  <Button variant="outline" size="sm" className="mt-8 rounded-xl px-8">
                    Browse Files
                  </Button>
                </motion.div>

                {/* Manual Entry / Template */}
                <motion.div 
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    const randomId = Math.floor(1000 + Math.random() * 9000);
                    setInvoice({
                      invoiceNumber: `INV-${randomId}`,
                      date: new Date().toISOString().split('T')[0],
                      dueDate: "",
                      sender: {
                        name: AIS_INFO.name,
                        address: AIS_INFO.address,
                        email: AIS_INFO.email,
                        phone: AIS_INFO.phone
                      },
                      recipient: { name: "", address: "", email: "", phone: "" },
                      items: [{ description: "", quantity: 1, unitPrice: 0 }],
                      subtotal: 0,
                      taxRate: 0,
                      taxAmount: 0,
                      totalAmount: 0,
                      currency: "BDT",
                      notes: ""
                    });
                  }}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-10 flex flex-col h-full shadow-sm cursor-pointer group hover:border-zinc-900 dark:hover:border-white transition-all"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Layout className="w-6 h-6 text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Manual Entry</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Use fixed AIS template</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 mb-6">
                    <Plus className="w-8 h-8 text-zinc-200 dark:text-zinc-800 mb-2" />
                    <p className="text-xs text-zinc-400 text-center">Start with a clean slate and add your info manually</p>
                  </div>
                  <Button 
                    className="w-full rounded-xl py-6 text-lg"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Blank Invoice
                  </Button>
                </motion.div>
              </div>

              {/* Google Drive Option */}
              <div className="flex flex-col items-center gap-6 py-12">
                <div className="flex items-center gap-6 w-full max-w-lg">
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-[0.2em]">or use cloud</span>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
                </div>
                <Button 
                  onClick={auth.isAuthenticated ? openPicker : handleConnectDrive} 
                  variant="outline" 
                  className="w-full max-w-md rounded-2xl py-8 border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-white transition-all bg-white dark:bg-zinc-900 shadow-sm"
                >
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mr-4">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 dark:text-white">{auth.isAuthenticated ? "Import from Google Drive" : "Connect Google Drive"}</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Pick files directly from your cloud</p>
                  </div>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { icon: Zap, title: "Instant Extraction", desc: "AI identifies line items, taxes, and totals in seconds.", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/10" },
                  { icon: Layout, title: "AIS Branding", desc: "Every invoice is perfectly formatted for your brand.", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/10" },
                  { icon: Download, title: "Export Anywhere", desc: "Download as PDF or print directly from your browser.", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/10" }
                ].map((feature, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", feature.bg)}>
                      <feature.icon className={cn("w-6 h-6", feature.color)} />
                    </div>
                    <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {isProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-40"
            >
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-zinc-900 dark:bg-white rounded-full blur-2xl opacity-20 animate-pulse" />
                <Loader2 className="w-16 h-16 text-zinc-900 dark:text-white animate-spin relative z-10" />
              </div>
              <h2 className="text-3xl font-bold mb-3 tracking-tight">Analyzing your document...</h2>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">Gemini 3.1 Pro is extracting details with precision</p>
            </motion.div>
          )}

          {invoice && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start print:block"
            >
              {/* Editor Panel */}
              <div className="lg:col-span-5 space-y-6 print:hidden">
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-900/5 overflow-hidden">
                  <div className="flex bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                    <button 
                      onClick={() => setActiveTab('details')}
                      className={cn(
                        "flex-1 py-5 text-xs font-bold uppercase tracking-widest transition-all",
                        activeTab === 'details' ? "text-zinc-900 dark:text-white bg-white dark:bg-zinc-900" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      )}
                    >
                      Details
                    </button>
                    <button 
                      onClick={() => setActiveTab('design')}
                      className={cn(
                        "flex-1 py-5 text-xs font-bold uppercase tracking-widest transition-all",
                        activeTab === 'design' ? "text-zinc-900 dark:text-white bg-white dark:bg-zinc-900" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                      )}
                    >
                      Design
                    </button>
                  </div>

                  <div className="p-8">
                    {activeTab === 'details' ? (
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold">Invoice Details</h3>
                          <Button variant="ghost" size="sm" onClick={() => setInvoice(null)} className="rounded-xl">
                            Start Over
                          </Button>
                        </div>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label className="flex justify-between">
                                Invoice #
                                <button 
                                  onClick={() => updateInvoice('invoiceNumber', `INV-${Math.floor(1000 + Math.random() * 9000)}`)}
                                  className="text-[10px] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
                                >
                                  <RefreshCcw className="w-2.5 h-2.5" /> Regenerate
                                </button>
                              </Label>
                              <Input value={invoice.invoiceNumber} onChange={(e) => updateInvoice('invoiceNumber', e.target.value)} />
                            </div>
                            <div>
                              <Label>Date</Label>
                              <Input type="date" value={invoice.date} onChange={(e) => updateInvoice('date', e.target.value)} />
                            </div>
                            <div>
                              <Label>Currency</Label>
                              <select 
                                value={invoice.currency} 
                                onChange={(e) => updateInvoice('currency', e.target.value)}
                                className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-4 py-2 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 dark:text-zinc-100"
                              >
                                <option value="USD">USD ($)</option>
                                <option value="BDT">BDT (৳)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="INR">INR (₹)</option>
                                <option value="CAD">CAD ($)</option>
                              </select>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                            <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-zinc-400" />
                              Sender Info
                            </h4>
                            <div className="space-y-4">
                              <Input placeholder="Company Name" value={invoice.sender.name} onChange={(e) => updateInvoice('sender.name', e.target.value)} />
                              <textarea 
                                className="flex min-h-[100px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-4 py-3 text-sm shadow-sm transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 dark:text-zinc-100 resize-none"
                                placeholder="Address" 
                                value={invoice.sender.address} 
                                onChange={(e) => updateInvoice('sender.address', e.target.value)} 
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Email" value={invoice.sender.email} onChange={(e) => updateInvoice('sender.email', e.target.value)} />
                                <Input placeholder="Phone" value={invoice.sender.phone} onChange={(e) => updateInvoice('sender.phone', e.target.value)} />
                              </div>
                            </div>
                          </div>

                          <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
                            <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                              <Mail className="w-4 h-4 text-zinc-400" />
                              Recipient Info
                            </h4>
                            <div className="space-y-4">
                              <Input placeholder="Client Name" value={invoice.recipient.name} onChange={(e) => updateInvoice('recipient.name', e.target.value)} />
                              <textarea 
                                className="flex min-h-[100px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 px-4 py-3 text-sm shadow-sm transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 dark:text-zinc-100 resize-none"
                                placeholder="Address" 
                                value={invoice.recipient.address} 
                                onChange={(e) => updateInvoice('recipient.address', e.target.value)} 
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <Input placeholder="Email" value={invoice.recipient.email} onChange={(e) => updateInvoice('recipient.email', e.target.value)} />
                                <Input placeholder="Phone" value={invoice.recipient.phone} onChange={(e) => updateInvoice('recipient.phone', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        <div>
                          <Label className="mb-4">Brand Logo</Label>
                          <div className="flex items-center gap-6">
                            <div className="w-24 h-24 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center overflow-hidden relative group shadow-inner">
                              {logo ? (
                                <img src={logo} alt="Logo" className="w-full h-full object-contain p-2" />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
                              )}
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleLogoUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">Upload your company logo. PNG or JPG recommended.</p>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="relative rounded-xl">
                                  Choose File
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleLogoUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                  />
                                </Button>
                                {logo && (
                                  <Button variant="danger" size="sm" onClick={() => setLogo(null)} className="rounded-xl">
                                    Remove
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="mb-4">Theme Color</Label>
                          <div className="grid grid-cols-6 gap-4">
                            {THEME_COLORS.map((color) => (
                              <button
                                key={color.value}
                                onClick={() => setThemeColor(color.value)}
                                className={cn(
                                  "w-full aspect-square rounded-2xl border-4 transition-all hover:scale-110",
                                  themeColor === color.value ? "border-zinc-900 dark:border-white shadow-lg" : "border-transparent"
                                )}
                                style={{ backgroundColor: color.value }}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="mb-4">Typography</Label>
                          <div className="grid grid-cols-1 gap-3">
                            {FONTS.map((font) => (
                              <button
                                key={font.value}
                                onClick={() => setFontFamily(font.value)}
                                className={cn(
                                  "w-full p-5 rounded-2xl border text-left transition-all flex items-center justify-between group",
                                  fontFamily === font.value ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800 shadow-sm" : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600"
                                )}
                              >
                                <span style={{ fontFamily: font.value }} className="text-sm font-medium">{font.name}</span>
                                {fontFamily === font.value ? (
                                  <CheckCircle2 className="w-5 h-5 text-zinc-900 dark:text-white" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {activeTab === 'details' && (
                  <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-900/5">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-lg font-bold">Line Items</h3>
                      <Button variant="outline" size="sm" onClick={addItem} className="rounded-xl">
                        <Plus className="w-4 h-4 mr-2" /> Add Item
                      </Button>
                    </div>
                    <div className="space-y-6">
                      {invoice.items.map((item, idx) => (
                        <div key={idx} className="p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl relative group transition-all hover:border-zinc-200 dark:hover:border-zinc-700">
                          <button 
                            onClick={() => removeItem(idx)}
                            className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="space-y-4">
                            <Input placeholder="Description" value={item.description} onChange={(e) => updateInvoice(`items.${idx}.description`, e.target.value)} />
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label>Qty</Label>
                                <Input type="number" value={item.quantity} onChange={(e) => updateInvoice(`items.${idx}.quantity`, parseFloat(e.target.value))} />
                              </div>
                              <div>
                                <Label>Price</Label>
                                <Input type="number" value={item.unitPrice} onChange={(e) => updateInvoice(`items.${idx}.unitPrice`, parseFloat(e.target.value))} />
                              </div>
                              <div>
                                <Label>Total</Label>
                                <div className="h-10 flex items-center px-4 text-sm font-bold text-zinc-900 dark:text-white bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                  {formatCurrency(item.quantity * item.unitPrice, invoice.currency)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Panel */}
              <div className="lg:col-span-7 print:w-full">
                <div className="sticky top-24 space-y-6 print:static print:top-0">
                  <div className="flex items-center justify-between mb-2 print:hidden">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Live Preview</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-xl">
                        <Printer className="w-4 h-4 mr-2" /> Print
                      </Button>
                      <Button size="sm" onClick={handlePrint} style={{ backgroundColor: themeColor }} className="rounded-xl shadow-lg shadow-zinc-900/10 dark:shadow-white/5">
                        <Download className="w-4 h-4 mr-2" /> Export PDF
                      </Button>
                    </div>
                  </div>

                  {/* The Actual Invoice Template */}
                  <div 
                    id="invoice-template" 
                    className="bg-white shadow-2xl dark:shadow-zinc-900/50 rounded-xl p-16 min-h-[1056px] w-full mx-auto text-zinc-900 print:shadow-none print:p-0 print:rounded-none overflow-hidden relative"
                    style={{ fontFamily }}
                  >
                    {/* Decorative element */}
                    <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: themeColor }} />
                    
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start mb-20">
                      <div>
                        <h1 className="text-5xl font-black tracking-tighter mb-3" style={{ color: themeColor }}>INVOICE</h1>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Number</span>
                          <p className="text-zinc-900 font-bold">#{invoice.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {logo ? (
                          <img src={logo} alt="Logo" className="h-20 object-contain ml-auto mb-6" />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center ml-auto mb-6 shadow-sm" style={{ backgroundColor: themeColor }}>
                            <FileText className="text-white w-8 h-8" />
                          </div>
                        )}
                        <p className="font-black text-xl mb-1">{invoice.sender.name || "Your Company"}</p>
                        <p className="text-xs text-zinc-500 max-w-[250px] ml-auto whitespace-pre-line leading-relaxed font-medium">{invoice.sender.address}</p>
                      </div>
                    </div>

                    {/* Billing Info */}
                    <div className="grid grid-cols-2 gap-16 mb-20">
                      <div className="relative">
                        <div className="absolute -left-6 top-0 bottom-0 w-1 rounded-full opacity-20" style={{ backgroundColor: themeColor }} />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-4">Bill To</p>
                        <p className="font-black text-2xl mb-2">{invoice.recipient.name || "Client Name"}</p>
                        <p className="text-sm text-zinc-500 leading-relaxed whitespace-pre-line font-medium mb-6">{invoice.recipient.address}</p>
                        <div className="space-y-2">
                          {invoice.recipient.email && (
                            <div className="flex items-center gap-3 text-xs text-zinc-600 font-bold">
                              <Mail className="w-3.5 h-3.5 opacity-40" /> {invoice.recipient.email}
                            </div>
                          )}
                          {invoice.recipient.phone && (
                            <div className="flex items-center gap-3 text-xs text-zinc-600 font-bold">
                              <Phone className="w-3.5 h-3.5 opacity-40" /> {invoice.recipient.phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-end">
                        <div className="space-y-6">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-1">Invoice Date</p>
                            <p className="font-bold text-lg">{invoice.date}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-1">Due Date</p>
                            <p className="font-bold text-lg" style={{ color: themeColor }}>{invoice.dueDate || invoice.date}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="mb-20">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-4" style={{ borderColor: themeColor }}>
                            <th className="py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Description</th>
                            <th className="py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center w-24">Qty</th>
                            <th className="py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right w-36">Price</th>
                            <th className="py-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right w-36">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {invoice.items.map((item, i) => (
                            <tr key={i} className="group">
                              <td className="py-8 align-top">
                                <p className="font-black text-zinc-900 text-lg mb-1">{item.description || "Service Description"}</p>
                                <p className="text-xs text-zinc-400 font-medium">Standard Service Rate</p>
                              </td>
                              <td className="py-8 align-top text-center font-bold text-zinc-600">{item.quantity}</td>
                              <td className="py-8 align-top text-right font-bold text-zinc-600">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                              <td className="py-8 align-top text-right font-black text-zinc-900 text-lg">{formatCurrency(item.quantity * item.unitPrice, invoice.currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary */}
                    <div className="flex justify-end mb-24">
                      <div className="w-80 space-y-4">
                        <div className="flex justify-between text-sm font-bold text-zinc-500">
                          <span className="uppercase tracking-widest">Subtotal</span>
                          <span className="text-zinc-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-zinc-500">
                          <span className="uppercase tracking-widest">Tax ({invoice.taxRate}%)</span>
                          <span className="text-zinc-900">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                        </div>
                        <div className="pt-6 border-t-4 flex justify-between items-center" style={{ borderColor: themeColor }}>
                          <span className="font-black text-xl uppercase tracking-tighter">Total Amount</span>
                          <span className="font-black text-4xl" style={{ color: themeColor }}>{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-16 border-t border-zinc-100">
                      <div className="grid grid-cols-2 gap-12">
                        <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Notes & Terms</p>
                          <p className="text-xs text-zinc-500 leading-relaxed font-medium italic bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                            {invoice.notes || "Thank you for your business. Please make payment by the due date. For any inquiries, please contact our support team."}
                          </p>
                        </div>
                        <div className="text-right flex flex-col justify-end">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3">Contact Information</p>
                            <p className="text-xs text-zinc-900 font-bold">{invoice.sender.email}</p>
                            <p className="text-xs text-zinc-900 font-bold">{invoice.sender.phone}</p>
                            {AIS_INFO.website && <p className="text-xs text-zinc-900 font-bold underline underline-offset-4" style={{ textDecorationColor: themeColor }}>{AIS_INFO.website}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {error && (
        <div className="fixed bottom-6 right-6 bg-red-50 border border-red-100 p-4 rounded-2xl shadow-lg flex items-center gap-3 max-w-md animate-in slide-in-from-bottom-4">
          <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-2">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
