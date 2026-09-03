import React, { useState } from 'react';
import { Inspection, DigitalListing, ComparisonResult } from '../types';
import { api } from '../services/api';
import { Globe, ArrowRightLeft, CheckCircle2, AlertTriangle, XCircle, HelpCircle, X, Sparkles } from 'lucide-react';

interface DigitalComparisonModalProps {
  inspection: Inspection;
  onClose: () => void;
  onComparisonUpdated: (updatedInspection: Inspection) => void;
}

export const DigitalComparisonModal: React.FC<DigitalComparisonModalProps> = ({
  inspection,
  onClose,
  onComparisonUpdated,
}) => {
  const [platform, setPlatform] = useState(inspection.comparison?.listing.platform || 'Amazon India');
  const [url, setUrl] = useState(inspection.comparison?.listing.url || 'https://www.amazon.in/dp/B09XXXXXX');
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

  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | undefined>(
    inspection.comparison
  );

  const handleRunComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const listingData: DigitalListing = {
        platform,
        url,
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
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPresetDiscrepancy = () => {
    setPlatform('QuickCommerce Grocery App');
    setUrl('https://instamart.example.com/item/10293');
    setTitle(`${inspection.brand || 'BakersTreat'} Cookies 500g Jumbo Value Pack`);
    setBrand(inspection.brand || 'BakersTreat');
    setNetQuantity('500 g'); // Discrepancy vs 250g physical package!
    setMrp('120.00'); // Higher price
    setManufacturerDetails('Marketed by Retail Trade Co.');
    setCountryOfOrigin('India');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-sm sm:text-base">
              Digital Listing Cross-Verification (E-Commerce Metrology)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs sm:text-sm">
          {/* Instruction & Explainer */}
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-indigo-900 text-xs">
            <div>
              <span className="font-bold block text-indigo-950">
                Rule 6(10) E-Commerce Compliance Cross-Check
              </span>
              <p className="text-indigo-800 mt-0.5">
                Verifies that declarations displayed to consumers on e-commerce marketplaces match the mandatory declarations physically printed on the commodity.
              </p>
            </div>
            <button
              type="button"
              onClick={loadPresetDiscrepancy}
              className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded text-xs shrink-0 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample E-Commerce Discrepancy</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleRunComparison} className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              1. Enter Digital Listing Attributes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">E-Commerce Marketplace / App</label>
                <input
                  type="text"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="e.g., Amazon, Flipkart, Blinkit"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Product Listing URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Online Listed Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Product Title shown on marketplace"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Online Listed Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="Brand Name"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Online Stated Net Quantity</label>
                <input
                  type="text"
                  value={netQuantity}
                  onChange={(e) => setNetQuantity(e.target.value)}
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
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="e.g., 195.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Online Manufacturer / Seller Name</label>
                <input
                  type="text"
                  value={manufacturerDetails}
                  onChange={(e) => setManufacturerDetails(e.target.value)}
                  placeholder="Manufacturer or Marketed by entity"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Online Country of Origin</label>
                <input
                  type="text"
                  value={countryOfOrigin}
                  onChange={(e) => setCountryOfOrigin(e.target.value)}
                  placeholder="e.g., India"
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded shadow-sm transition-colors disabled:opacity-50"
              >
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                <span>{loading ? 'Comparing...' : 'Run Cross-Verification Check'}</span>
              </button>
            </div>
          </form>

          {/* Results Comparison Table */}
          {comparisonResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  2. Cross-Verification Comparison Results
                </h4>
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

              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-semibold">Statutory Field</th>
                      <th className="p-3 font-semibold">Physical Package (OCR Ground Truth)</th>
                      <th className="p-3 font-semibold">E-Commerce Marketplace Listing</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {comparisonResult.items.map((item) => (
                      <tr key={item.field} className={item.status === 'MISMATCH' ? 'bg-rose-50/60' : ''}>
                        <td className="p-3 font-bold text-slate-900">{item.label}</td>
                        <td className="p-3 font-mono text-slate-800">
                          {item.packageValue || <span className="text-slate-400 italic">Not extracted</span>}
                        </td>
                        <td className="p-3 font-mono text-slate-800">
                          {item.listingValue || <span className="text-slate-400 italic">Not provided</span>}
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
                                <p className="text-[11px] text-rose-800 font-medium mt-1">
                                  {item.discrepancyNote}
                                </p>
                              )}
                            </div>
                          )}
                          {item.status === 'NOT_AVAILABLE' && (
                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Not Available
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

              <div className="bg-slate-100 p-3 rounded text-xs text-slate-700">
                <span className="font-bold text-slate-900">Enforcement Summary: </span>
                <span>{comparisonResult.summary}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
