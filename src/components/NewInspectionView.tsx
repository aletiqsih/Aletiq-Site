import React, { useState, useRef, useEffect } from 'react';
import { PackageSide, InspectionImage, Inspection } from '../types';
import { api } from '../services/api';
import { analyzeImageQuality } from '../utils/imageQuality';
import { SAMPLE_PACKAGE_PRESETS, SamplePackagePreset } from '../data/samplePackages';
import {
  UploadCloud,
  Camera,
  Trash2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface NewInspectionViewProps {
  onInspectionCreated: (inspection: Inspection) => void;
  onCancel: () => void;
  initialPresetId?: string;
}

export const NewInspectionView: React.FC<NewInspectionViewProps> = ({
  onInspectionCreated,
  onCancel,
  initialPresetId,
}) => {
  // Metadata state
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [inspectorName, setInspectorName] = useState('P. K. Verma, Senior Inspector');
  const [inspectorLocation, setInspectorLocation] = useState('Enforcement Directorate, Delhi Zone');
  const [batchNumber, setBatchNumber] = useState('');
  const [retailerName, setRetailerName] = useState('');

  // Images state
  const [images, setImages] = useState<InspectionImage[]>([]);
  const [selectedSide, setSelectedSide] = useState<PackageSide>('front');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Camera capture state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Analysis Progress state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // If initial preset is passed
  useEffect(() => {
    if (initialPresetId) {
      const preset = SAMPLE_PACKAGE_PRESETS.find(p => p.id === initialPresetId);
      if (preset) {
        loadPreset(preset);
      }
    }
  }, [initialPresetId]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const loadPreset = (preset: SamplePackagePreset) => {
    setProductName(preset.productName);
    setBrand(preset.brand);
    setRetailerName(preset.retailerName);
    setBatchNumber(`LOT-${Math.floor(1000 + Math.random() * 9000)}`);

    const loadedImages: InspectionImage[] = preset.images.map((img, idx) => ({
      id: `img_preset_${Date.now()}_${idx}`,
      name: img.name,
      side: img.side,
      url: img.url,
      sizeBytes: 240000,
      mimeType: 'image/jpeg',
      timestamp: new Date().toISOString(),
      quality: {
        isAcceptable: true,
        blurScore: 88,
        brightnessScore: 72,
        glareDetected: false,
        textLegibilityEstimated: true,
        warnings: [],
      },
    }));

    setImages(loadedImages);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsAnalyzingImage(true);
    const newImgs: InspectionImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await readFileAsDataURL(file);
      const quality = await analyzeImageQuality(dataUrl);

      // determine default side: if first image is front, subsequent might be back/side
      let sideToAssign: PackageSide = selectedSide;
      if (images.length === 0 && i === 0) sideToAssign = 'front';
      else if (images.length === 1 || i === 1) sideToAssign = 'back';
      else if (images.length === 2 || i === 2) sideToAssign = 'left';

      newImgs.push({
        id: `img_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
        name: file.name,
        side: sideToAssign,
        url: dataUrl,
        sizeBytes: file.size,
        mimeType: file.type || 'image/jpeg',
        timestamp: new Date().toISOString(),
        quality,
      });
    }

    setImages(prev => [...prev, ...newImgs]);
    setIsAnalyzingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const startCamera = async () => {
    try {
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Could not access camera. Please verify device permissions or use file upload.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 800;
    canvas.height = videoRef.current.videoHeight || 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const quality = await analyzeImageQuality(dataUrl);

    const newImage: InspectionImage = {
      id: `img_cam_${Date.now()}`,
      name: `camera_capture_${selectedSide}.jpg`,
      side: selectedSide,
      url: dataUrl,
      sizeBytes: Math.round((dataUrl.length * 3) / 4),
      mimeType: 'image/jpeg',
      timestamp: new Date().toISOString(),
      quality,
    };

    setImages(prev => [...prev, newImage]);
    stopCamera();
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const updateImageSide = (id: string, side: PackageSide) => {
    setImages(prev => prev.map(img => (img.id === id ? { ...img, side } : img)));
  };

  const handleStartAnalysis = async () => {
    if (images.length === 0) {
      setErrorMessage('Please upload or capture at least one package panel image before analyzing.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setAnalysisStep(1);

    try {
      // Step 1: Create draft inspection record
      const createRes = await api.createInspection({
        productName: productName.trim() || 'Packaged Commodity',
        brand: brand.trim(),
        inspectorName: inspectorName.trim(),
        inspectorLocation: inspectorLocation.trim(),
        batchNumber: batchNumber.trim(),
        retailerName: retailerName.trim(),
      });

      if (!createRes.success || !createRes.data) {
        throw new Error('Failed to initialize inspection record');
      }

      const inspectionId = createRes.data.id;

      // Step 2: Upload all images to the inspection record
      setAnalysisStep(2);
      for (const img of images) {
        await api.uploadImage(inspectionId, img);
      }

      // Step 3: Run AI Multimodal Extraction & Legal Metrology Rule Engine
      setAnalysisStep(3);
      const analysisRes = await api.runAnalysis(inspectionId);

      if (!analysisRes.success || !analysisRes.data) {
        throw new Error(analysisRes.error || 'Optical compliance assessment failed');
      }

      setAnalysisStep(4);
      setTimeout(() => {
        onInspectionCreated(analysisRes.data);
      }, 600);
    } catch (err: any) {
      console.error('Inspection analysis failure:', err);
      setErrorMessage(err.message || 'An error occurred during compliance analysis');
      setIsSubmitting(false);
    }
  };

  const sideCoverageCount = new Set(images.map(img => img.side)).size;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            New Package Compliance Inspection
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Capture or upload packaged product images to evaluate statutory Legal Metrology compliance.
          </p>
        </div>

        {/* Demo Preset Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500">Quick Test:</span>
          <select
            onChange={e => {
              const p = SAMPLE_PACKAGE_PRESETS.find(item => item.id === e.target.value);
              if (p) loadPreset(p);
            }}
            defaultValue=""
            className="text-xs font-medium border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="" disabled>
              Load Sample Package...
            </option>
            {SAMPLE_PACKAGE_PRESETS.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Inspection Metadata */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5">
            <Layers className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
              1. Inspection Metadata
            </h2>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Product Commodity Title
            </label>
            <input
              type="text"
              value={productName}
              onChange={e => setProductName(e.target.value)}
              placeholder="e.g., Organic Rolled Oats, Wild Honey"
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Brand Name
            </label>
            <input
              type="text"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="e.g., NatureHarvest"
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Batch / Lot Number
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={e => setBatchNumber(e.target.value)}
              placeholder="e.g., LOT-2026-B91"
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Sampling / Retail Location
            </label>
            <input
              type="text"
              value={retailerName}
              onChange={e => setRetailerName(e.target.value)}
              placeholder="e.g., BigBazaar Sector 14"
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="block text-slate-700 font-semibold mb-1">
              Inspecting Officer Name
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={e => setInspectorName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Enforcement Zonal Station
            </label>
            <input
              type="text"
              value={inspectorLocation}
              onChange={e => setInspectorLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs"
            />
          </div>
        </div>

        {/* Right Column: Multi-panel Image Capture & Upload */}
        <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-emerald-600" />
              <h2 className="font-bold text-slate-900 uppercase tracking-wider text-xs">
                2. Multi-Panel Packaging Images ({images.length} Added)
              </h2>
            </div>

            {/* Coverage status */}
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                sideCoverageCount >= 2
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : images.length === 1
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {sideCoverageCount >= 2
                ? `Multi-Panel (${sideCoverageCount} sides)`
                : images.length === 1
                ? 'Single Panel (Review Mode)'
                : 'No Panels'}
            </span>
          </div>

          {/* Side Guidance Warning */}
          {images.length === 1 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start space-x-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Recommendation:</strong> Only 1 side panel uploaded. For comprehensive assessment, upload back and side panels to enable manufacturer address, MRP tax wording, and date of packing checks.
              </p>
            </div>
          )}

          {/* Camera Modal / Viewfinder */}
          {showCamera && (
            <div className="bg-slate-900 p-4 rounded-xl text-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Live Camera Viewfinder</span>
                <span className="text-xs text-emerald-400">
                  Target Panel: <strong className="uppercase">{selectedSide}</strong>
                </span>
              </div>
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-4 border border-emerald-500/50 rounded pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] bg-slate-900/80 px-2 py-1 rounded text-slate-300">
                    Align statutory package text within box
                  </span>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded transition-colors shadow-sm"
                >
                  Capture {selectedSide.toUpperCase()} Panel
                </button>
              </div>
            </div>
          )}

          {/* Upload Dropzone & Controls */}
          {!showCamera && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-semibold text-slate-700">Next Upload Side:</span>
                  <select
                    value={selectedSide}
                    onChange={e => setSelectedSide(e.target.value as PackageSide)}
                    className="border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800 uppercase text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="front">Front Panel (Display)</option>
                    <option value="back">Back Panel (Information)</option>
                    <option value="left">Left Side</option>
                    <option value="right">Right Side</option>
                    <option value="top">Top Panel</option>
                    <option value="bottom">Bottom / Base Panel</option>
                    <option value="other">Other Side</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded transition-colors border border-slate-300"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-600" />
                  <span>Use Camera</span>
                </button>
              </div>

              {/* Drag & Drop Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-800">
                  Click to select or drag & drop packaged product photos
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Supports JPG, PNG, WEBP (Clear, well-lit photographs recommended)
                </p>
              </div>
            </div>
          )}

          {/* Uploaded Image Cards List */}
          {images.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Attached Package Panels ({images.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="flex items-center space-x-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="w-14 h-14 bg-slate-200 rounded overflow-hidden shrink-0">
                      <img
                        src={img.url}
                        alt={`Panel ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <select
                          value={img.side}
                          onChange={e => updateImageSide(img.id, e.target.value as PackageSide)}
                          className="text-[10px] font-bold uppercase bg-white border border-slate-300 rounded px-1.5 py-0.5"
                        >
                          <option value="front">Front</option>
                          <option value="back">Back</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="other">Other</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-2 text-[10px]">
                        <span className="text-slate-500 truncate">{img.name}</span>
                        {img.quality?.isAcceptable ? (
                          <span className="text-emerald-700 font-medium">Legible</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Check Quality</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={isSubmitting || images.length === 0}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Run Legal Metrology Compliance Analysis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Pipeline Analysis Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-6">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Cpu className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Evaluating Packaged Commodity Compliance
              </h3>
              <p className="text-xs text-slate-500">
                Processing {images.length} panel(s) under Legal Metrology Rules, 2011
              </p>
            </div>

            {/* Steps Progress */}
            <div className="space-y-3 text-left text-xs">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    analysisStep >= 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  1
                </div>
                <span className={analysisStep >= 1 ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                  Optical Quality & Multi-Panel Image Registration
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    analysisStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  2
                </div>
                <span className={analysisStep >= 2 ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                  Multimodal OCR & Statutory Field Extraction
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    analysisStep >= 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  3
                </div>
                <span className={analysisStep >= 3 ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                  Aletiq Rule Engine Legal Metrology Verification
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    analysisStep >= 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  4
                </div>
                <span className={analysisStep >= 4 ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                  Generating Compliance Score & Evidence Report
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
