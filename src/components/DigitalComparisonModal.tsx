import React, { useState } from 'react';
import {
  Inspection,
  DigitalListing,
  ComparisonResult,
  ProductUrlAnalysisResponse,
  ExtractedDeclarations,
  ComplianceResult,
} from '../types';
import { api } from '../services/api';
import {
  Globe,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  X,
  Sparkles,
  ExternalLink,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Layers,
  Cpu,
  ChevronDown,
  ChevronUp,
  FileWarning,
  Upload,
} from 'lucide-react';

interface DigitalComparisonModalProps {
  inspection: Inspection;
  onClose: () => void;
  onComparisonUpdated: (updatedInspection: Inspection) => void;
}

const SAMPLE_DEMO_URL = 'https://demo.aletiq.gov.in/sample/cashew-cookies-500g';

export const DigitalComparisonModal: React.FC<DigitalComparisonModalProps> = ({
  inspection,
  onClose,
  onComparisonUpdated,
}) => {
  // Primary URL state
  const [productUrl, setProductUrl] = useState<string>(
    inspection.comparison?.listing.url || ''
  );

  // Analysis status & phases
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackTriggered, setFallbackTriggered] = useState<boolean>(false);
  const [showManualForm, setShowManualForm] = useState<boolean>(false);

  // Analysis result state
  const [urlAnalysisResponse, setUrlAnalysisResponse] = useState<ProductUrlAnalysisResponse | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | undefined>(
    inspection.comparison
  );

  // Editable manual / fallback fields
  const [platform, setPlatform] = useState(inspection.comparison?.listing.platform || 'QuickCommerce App');
  const [title, setTitle] = useState(
    inspection.comparison?.listing.title || inspection.productName || ''
  );
  const [brand, setBrand] = useState(inspection.comparison?.listing.brand || inspection.brand || '');
  const [netQuantity, setNetQuantity] = useState(
    inspection.comparison?.listing.netQuantity ||
      inspection.result?.extractedDeclarations.net_quantity?.value ||
      ''
  );
  const [mrp, setMrp] = useState(
    inspection.comparison?.listing.mrp ||
      inspection.result?.extractedDeclarations.mrp?.value?.replace(/[^0-9.]/g, '') ||
      ''
  );
  const [manufacturerDetails, setManufacturerDetails] = useState(
    inspection.comparison?.listing.manufacturerDetails ||
      inspection.result?.extractedDeclarations.manufacturer_name?.value ||
      ''
  );
  const [countryOfOrigin, setCountryOfOrigin] = useState(
    inspection.comparison?.listing.countryOfOrigin ||
      inspection.result?.extractedDeclarations.country_of_origin?.value ||
      'India'
  );

  // 1. Analyze E-Commerce Product from URL
  const handleAnalyzeUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const targetUrl = productUrl.trim();
    if (!targetUrl) {
      setErrorMessage('Please enter an e-commerce product URL to analyze.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setFallbackTriggered(false);

    try {
      // Step 1: Fetching
      setLoadingPhase('Fetching product page from marketplace...');
      await new Promise(r => setTimeout(r, 400));

      // Step 2: Extraction & Rule Engine in Backend
      setLoadingPhase('Extracting structured product declarations (JSON-LD / Metadata)...');
      const response = await api.analyzeProductUrl(targetUrl, inspection.id);

      // Step 3: Checking compliance
      setLoadingPhase('Evaluating Aletiq Legal Metrology compliance & cross-verification...');
      await new Promise(r => setTimeout(r, 400));

      if (response && response.success) {
        setUrlAnalysisResponse(response);
        setComparisonResult(response.comparison);

        // Populate fallback/editable state with extracted values
        if (response.listing) {
          if (response.listing.platform) setPlatform(response.listing.platform);
          if (response.listing.title) setTitle(response.listing.title);
          if (response.listing.brand) setBrand(response.listing.brand);
          if (response.listing.netQuantity) setNetQuantity(response.listing.netQuantity);
          if (response.listing.mrp) setMrp(response.listing.mrp);
          if (response.listing.manufacturerDetails) setManufacturerDetails(response.listing.manufacturerDetails);
          if (response.listing.countryOfOrigin) setCountryOfOrigin(response.listing.countryOfOrigin);
        }

        if (response.inspection) {
          onComparisonUpdated(response.inspection);
        }
      } else {
        throw new Error(response.error || 'Failed to extract product information from URL');
      }
    } catch (err: any) {
      console.error('URL product analysis error:', err);
      setErrorMessage(
        err.message || 'Unable to automatically extract product information from this website.'
      );
      setFallbackTriggered(true);
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  // 2. Load Sample Product URL and immediately trigger URL extraction pipeline
  const handleLoadSampleUrl = () => {
    setProductUrl(SAMPLE_DEMO_URL);
    setErrorMessage(null);
    setFallbackTriggered(false);

    // Run real backend analysis with sample URL
    setTimeout(() => {
      setIsLoading(true);
      setLoadingPhase('Fetching sample product page...');
      api
        .analyzeProductUrl(SAMPLE_DEMO_URL, inspection.id)
        .then(response => {
          if (response && response.success) {
            setUrlAnalysisResponse(response);
            setComparisonResult(response.comparison);
            if (response.listing) {
              setPlatform(response.listing.platform || 'QuickMart Grocery');
              setTitle(response.listing.title || '');
              setBrand(response.listing.brand || '');
              setNetQuantity(response.listing.netQuantity || '');
              setMrp(response.listing.mrp || '');
              setManufacturerDetails(response.listing.manufacturerDetails || '');
              setCountryOfOrigin(response.listing.countryOfOrigin || 'India');
            }
            if (response.inspection) {
              onComparisonUpdated(response.inspection);
            }
          }
        })
        .catch(err => {
          setErrorMessage(err.message || 'Error processing sample product URL');
          setFallbackTriggered(true);
        })
        .finally(() => {
          setIsLoading(false);
          setLoadingPhase('');
        });
    }, 100);
  };

  // 3. Fallback / Manual Submission
  const handleRunManualComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoadingPhase('Running physical vs digital cross-verification check...');
    try {
      const listingData: DigitalListing = {
        platform,
        url: productUrl || 'https://manual-entry.aletiq.internal',
        title,
        brand,
        netQuantity,
        mrp,
        manufacturerDetails,
        countryOfOrigin,
      };

      const res = await api.compareWithListing(inspection.id, listingData);
      if (res.success && res.data) {
        setComparisonResult(res.data.comparison);
        onComparisonUpdated(res.data);
      }
    } catch (err: any) {
      console.error('Manual comparison error:', err);
      setErrorMessage(err.message || 'Error running manual cross-verification');
    } finally {
      setIsLoading(false);
      setLoadingPhase('');
    }
  };

  const extractedDecl = urlAnalysisResponse?.extractedDeclarations;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 flex items-center justify-center border border-indigo-500/40">
              <Globe className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base leading-tight">
                E-Commerce Product URL Compliance Analysis
              </h3>
              <p className="text-[11px] text-slate-400">
                Rule 6(10) Cross-Verification • Legal Metrology (Packaged Commodities) Rules, 2011
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm">
          {/* Statutory Explainer Banner & Sample CTA */}
          <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-950 text-xs">
            <div className="space-y-1">
              <span className="font-bold flex items-center space-x-1.5 text-indigo-950">
                <ShieldCheck className="w-4 h-4 text-indigo-700" />
                <span>Automated E-Commerce URL Verification</span>
              </span>
              <p className="text-indigo-900/90 text-[11px] leading-relaxed">
                Fetches marketplace product webpages, extracts structured declarations (JSON-LD / OpenGraph / Schema.org), and verifies statutory compliance against physical commodity ground truth.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLoadSampleUrl}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-3.5 py-2 rounded-lg text-xs shrink-0 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Product URL</span>
            </button>
          </div>

          {/* Primary Product URL Input Box */}
          <div className="bg-white border-2 border-indigo-100 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="product-url-input" className="block font-bold text-slate-900 text-xs uppercase tracking-wider">
                Enter Product URL for Compliance Analysis
              </label>
              <span className="text-[11px] text-slate-500">
                Supports Amazon, Flipkart, Blinkit, QuickCommerce, & standard e-commerce stores
              </span>
            </div>

            <form onSubmit={handleAnalyzeUrl} className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="product-url-input"
                  type="url"
                  value={productUrl}
                  onChange={e => setProductUrl(e.target.value)}
                  placeholder="https://example.com/product/sample-product"
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !productUrl.trim()}
                className="inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-sm transition-colors shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Analyze Product</span>
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Pre-sets Row */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Quick Test URLs:</span>
              <button
                type="button"
                onClick={handleLoadSampleUrl}
                className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded border border-slate-200 transition-colors"
              >
                Cashew Butter Cookies 500g (QuickCommerce Discrepancy Sample)
              </button>
            </div>
          </div>

          {/* Loading Animation Card */}
          {isLoading && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-3">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{loadingPhase}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Parsing schema.org JSON-LD, OpenGraph tags, and evaluating LMPC Rule 6(10)...
                </p>
              </div>
            </div>
          )}

          {/* Error & Fallback Banner */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <div className="flex items-start space-x-2.5 text-rose-900 text-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">
                    Unable to automatically extract product information from this website.
                  </span>
                  <p className="text-[11px] text-rose-800 leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>

              {fallbackTriggered && (
                <div className="pt-2 border-t border-rose-200/60 flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="font-semibold text-rose-900 text-[11px]">Choose a fallback option:</span>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(true)}
                    className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-medium px-3 py-1.5 rounded-lg text-xs transition-colors shadow-2xs"
                  >
                    <span>Enter Product Details Manually</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualForm(true);
                      alert('You can enter product specifications below or attach a product screenshot to your inspection.');
                    }}
                    className="inline-flex items-center space-x-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 font-medium px-3 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Product Screenshot / Spec Sheet</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Extracted Product Information Display Card */}
          {urlAnalysisResponse && urlAnalysisResponse.success && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Extracted E-Commerce Declarations
                  </span>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      {urlAnalysisResponse.listing.title}
                    </h4>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded">
                    Tier: {urlAnalysisResponse.extractionTier}
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                    {urlAnalysisResponse.confidence}% Extr. Confidence
                  </span>
                </div>
              </div>

              {/* Source URL Display */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-bold text-slate-700">Source:</span>
                  <a
                    href={urlAnalysisResponse.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-indigo-700 hover:underline truncate"
                  >
                    {urlAnalysisResponse.sourceUrl}
                  </a>
                </div>
                <span className="text-[10px] font-medium text-slate-500 shrink-0 ml-2 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {urlAnalysisResponse.platform || 'Online Marketplace'}
                </span>
              </div>

              {/* Grid of Extracted Statutory Declarations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {/* 1. Commodity & Brand */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Commodity & Brand
                  </span>
                  <div className="font-bold text-slate-900 truncate">
                    {urlAnalysisResponse.listing.title || <span className="text-rose-600">Missing</span>}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Brand: <strong>{urlAnalysisResponse.listing.brand || 'Not Specified'}</strong>
                  </div>
                </div>

                {/* 2. Net Quantity */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Net Quantity
                    </span>
                    {urlAnalysisResponse.listing.netQuantity ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Extracted
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        Missing
                      </span>
                    )}
                  </div>
                  <div className="font-bold font-mono text-slate-900 text-sm">
                    {urlAnalysisResponse.listing.netQuantity || <span className="text-rose-600 font-sans text-xs">Not declared online</span>}
                  </div>
                </div>

                {/* 3. Listed MRP / Price */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      MRP / Listed Price
                    </span>
                    {urlAnalysisResponse.listing.mrp ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Extracted
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        Missing
                      </span>
                    )}
                  </div>
                  <div className="font-bold font-mono text-slate-900 text-sm">
                    {urlAnalysisResponse.listing.mrp ? `₹ ${urlAnalysisResponse.listing.mrp}` : <span className="text-rose-600 font-sans text-xs">Not declared online</span>}
                  </div>
                </div>

                {/* 4. Manufacturer / Packer */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Manufacturer / Packer Details
                    </span>
                    {urlAnalysisResponse.listing.manufacturerDetails ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Extracted
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        Missing
                      </span>
                    )}
                  </div>
                  <div className="text-slate-900 font-medium text-[11px] leading-snug">
                    {urlAnalysisResponse.listing.manufacturerDetails || <span className="text-rose-600">Omitted from product listing</span>}
                  </div>
                </div>

                {/* 5. Country of Origin */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Country of Origin
                    </span>
                    {urlAnalysisResponse.listing.countryOfOrigin ? (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Extracted
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                        Missing
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-slate-900">
                    {urlAnalysisResponse.listing.countryOfOrigin || <span className="text-rose-600">Not declared</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Comparison Table (Physical vs Digital) */}
          {comparisonResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Statutory Cross-Verification Matrix
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Physical Package Ground Truth vs E-Commerce Digital Listing Declarations
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      comparisonResult.overallStatus === 'CONSISTENT'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {comparisonResult.overallStatus === 'CONSISTENT'
                      ? 'Consistent Alignment'
                      : 'Discrepancy Detected'}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    Match Rate: {comparisonResult.matchRate}%
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-semibold">Statutory Field</th>
                      <th className="p-3 font-semibold">Physical Package (OCR Ground Truth)</th>
                      <th className="p-3 font-semibold">E-Commerce Marketplace Listing</th>
                      <th className="p-3 font-semibold">Verification Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {comparisonResult.items.map(item => (
                      <tr key={item.field} className={item.status === 'MISMATCH' ? 'bg-rose-50/60' : ''}>
                        <td className="p-3 font-bold text-slate-900">{item.label}</td>
                        <td className="p-3 font-mono text-slate-800">
                          {item.packageValue || <span className="text-slate-400 italic font-sans">Not extracted</span>}
                        </td>
                        <td className="p-3 font-mono text-slate-800">
                          {item.listingValue || <span className="text-slate-400 italic font-sans">Not declared online</span>}
                        </td>
                        <td className="p-3">
                          {item.status === 'MATCH' && (
                            <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Match</span>
                            </span>
                          )}
                          {item.status === 'MISMATCH' && (
                            <div>
                              <span className="inline-flex items-center space-x-1 text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Mismatch</span>
                              </span>
                              {item.discrepancyNote && (
                                <p className="text-[11px] text-rose-800 font-medium mt-1 leading-tight">
                                  {item.discrepancyNote}
                                </p>
                              )}
                            </div>
                          )}
                          {item.status === 'NOT_AVAILABLE' && (
                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Omitted Online
                            </span>
                          )}
                          {item.status === 'UNABLE_TO_DETERMINE' && (
                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Unresolved
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-100 p-3 rounded-lg text-xs text-slate-700">
                <span className="font-bold text-slate-900">Enforcement Determination: </span>
                <span>{comparisonResult.summary}</span>
              </div>
            </div>
          )}

          {/* Expandable Manual Form / Override Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowManualForm(prev => !prev)}
              className="w-full bg-slate-50 hover:bg-slate-100 p-3 text-left font-semibold text-xs text-slate-700 flex items-center justify-between transition-colors"
            >
              <span>Manual Listing Fields Override / Direct Entry</span>
              {showManualForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showManualForm && (
              <form onSubmit={handleRunManualComparison} className="p-4 space-y-3 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">E-Commerce Marketplace</label>
                    <input
                      type="text"
                      value={platform}
                      onChange={e => setPlatform(e.target.value)}
                      placeholder="e.g., QuickMart, Amazon, Blinkit"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Online Listed Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Product Title shown on marketplace"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Online Stated Net Quantity</label>
                    <input
                      type="text"
                      value={netQuantity}
                      onChange={e => setNetQuantity(e.target.value)}
                      placeholder="e.g., 500 g, 1 kg"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Online Stated MRP / Price (₹)</label>
                    <input
                      type="text"
                      value={mrp}
                      onChange={e => setMrp(e.target.value)}
                      placeholder="e.g., 120.00"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Online Manufacturer / Seller Name</label>
                    <input
                      type="text"
                      value={manufacturerDetails}
                      onChange={e => setManufacturerDetails(e.target.value)}
                      placeholder="Manufacturer or Marketed by entity"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Online Country of Origin</label>
                    <input
                      type="text"
                      value={countryOfOrigin}
                      onChange={e => setCountryOfOrigin(e.target.value)}
                      placeholder="e.g., India"
                      className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm transition-colors disabled:opacity-50"
                  >
                    <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                    <span>Run Manual Cross-Verification</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
