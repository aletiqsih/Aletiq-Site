import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { inspectionRepository } from './server/db/inspectionRepository';
import { LEGAL_RULES } from './src/data/legalRules';
import { extractPackageDeclarationsWithGemini } from './server/ai/geminiExtractor';
import { evaluateLegalMetrologyCompliance } from './server/engine/ruleEngine';
import { comparePackageWithDigitalListing } from './server/services/comparisonService';
import { generateImprovementNoticeDraft } from './server/services/noticeService';
import { Inspection, InspectionImage } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 package photos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================
  // API ROUTES
  // ==========================================

  // 1. Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Aletiq Legal Metrology Compliance Intelligence API',
      version: '1.0.0-SIH26034',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Rules API
  app.get('/api/rules', (req, res) => {
    try {
      const { search, category } = req.query;
      let rules = [...LEGAL_RULES];

      if (category && typeof category === 'string' && category !== 'ALL') {
        rules = rules.filter(r => r.category.toLowerCase() === category.toLowerCase());
      }

      if (search && typeof search === 'string') {
        const query = search.toLowerCase();
        rules = rules.filter(
          r =>
            r.rule_name.toLowerCase().includes(query) ||
            r.rule_id.toLowerCase().includes(query) ||
            r.legal_reference.toLowerCase().includes(query) ||
            r.description.toLowerCase().includes(query)
        );
      }

      res.json({ success: true, count: rules.length, data: rules });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/rules/:id', (req, res) => {
    const rule = LEGAL_RULES.find(r => r.rule_id === req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }
    res.json({ success: true, data: rule });
  });

  // 3. Inspections API
  app.get('/api/inspections', async (req, res) => {
    try {
      const { search, status } = req.query;
      let list = await inspectionRepository.getAll();

      if (status && typeof status === 'string' && status !== 'ALL') {
        list = list.filter(i => i.result?.overallStatus === status);
      }

      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        list = list.filter(
          i =>
            i.title.toLowerCase().includes(q) ||
            i.id.toLowerCase().includes(q) ||
            (i.productName && i.productName.toLowerCase().includes(q)) ||
            (i.brand && i.brand.toLowerCase().includes(q))
        );
      }

      res.json({ success: true, count: list.length, data: list });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.post('/api/inspections', async (req, res) => {
    try {
      const { title, productName, brand, inspectorName, inspectorLocation, batchNumber, retailerName } = req.body;
      const all = await inspectionRepository.getAll();
      const count = all.length + 1;
      const id = `INSP-2026-${String(count).padStart(3, '0')}`;

      const newInspection: Inspection = {
        id,
        title: title || productName || `Package Inspection #${count}`,
        productName: productName || 'Packaged Commodity',
        brand: brand || '',
        inspectorName: inspectorName || 'Field Enforcement Officer',
        inspectorLocation: inspectorLocation || 'Zonal Legal Metrology Directorate',
        batchNumber: batchNumber || '',
        retailerName: retailerName || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        images: [],
      };

      const saved = await inspectionRepository.save(newInspection);
      res.status(201).json({ success: true, data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/inspections/:id', async (req, res) => {
    const inspection = await inspectionRepository.getById(req.params.id);
    if (!inspection) {
      return res.status(404).json({ success: false, error: 'Inspection record not found' });
    }
    res.json({ success: true, data: inspection });
  });

  app.delete('/api/inspections/:id', async (req, res) => {
    const ok = await inspectionRepository.delete(req.params.id);
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Inspection not found' });
    }
    res.json({ success: true, message: 'Inspection deleted successfully' });
  });

  // Add / Update Images for an Inspection
  app.post('/api/inspections/:id/images', async (req, res) => {
    try {
      const inspection = await inspectionRepository.getById(req.params.id);
      if (!inspection) {
        return res.status(404).json({ success: false, error: 'Inspection not found' });
      }

      const { image } = req.body as { image: InspectionImage };
      if (!image || !image.url) {
        return res.status(400).json({ success: false, error: 'Valid image object with URL/base64 is required' });
      }

      const imageId = image.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newImage: InspectionImage = {
        ...image,
        id: imageId,
        timestamp: image.timestamp || new Date().toISOString(),
        quality: image.quality || {
          isAcceptable: true,
          blurScore: 85,
          brightnessScore: 70,
          glareDetected: false,
          textLegibilityEstimated: true,
          warnings: [],
        },
      };

      // Check if image already exists
      const existingIdx = inspection.images.findIndex(img => img.id === imageId);
      if (existingIdx >= 0) {
        inspection.images[existingIdx] = newImage;
      } else {
        inspection.images.push(newImage);
      }

      const saved = await inspectionRepository.save(inspection);
      res.json({ success: true, data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/inspections/:id/images/:imageId', async (req, res) => {
    try {
      const inspection = await inspectionRepository.getById(req.params.id);
      if (!inspection) {
        return res.status(404).json({ success: false, error: 'Inspection not found' });
      }

      inspection.images = inspection.images.filter(img => img.id !== req.params.imageId);
      const saved = await inspectionRepository.save(inspection);
      res.json({ success: true, data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 4. Run Analysis (AI Multimodal Extraction + Aletiq Rule Engine)
  app.post('/api/inspections/:id/analyze', async (req, res) => {
    try {
      const inspection = await inspectionRepository.getById(req.params.id);
      if (!inspection) {
        return res.status(404).json({ success: false, error: 'Inspection not found' });
      }

      if (inspection.images.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No package images submitted for analysis. Please upload at least one package panel.',
        });
      }

      inspection.status = 'analyzing';
      await inspectionRepository.save(inspection);

      // Step 1: AI Multimodal Extraction (Reading & OCR)
      const extracted = await extractPackageDeclarationsWithGemini(inspection.images);

      // Step 2: Aletiq Independent Legal Metrology Rule Engine Assessment
      const complianceResult = evaluateLegalMetrologyCompliance({
        inspectionId: inspection.id,
        extractedDeclarations: extracted,
        images: inspection.images,
        productCategory: extracted.product_category?.value || undefined,
      });

      // Step 3: Update inspection with extracted info and final assessment
      inspection.result = complianceResult;
      inspection.status = 'completed';
      if (extracted.product_name?.value) {
        inspection.productName = extracted.product_name.value;
      }
      if (extracted.brand?.value) {
        inspection.brand = extracted.brand.value;
      }
      inspection.title = `${inspection.brand ? inspection.brand + ' ' : ''}${inspection.productName || 'Inspected Package'}`;

      // Auto-generate notice draft
      inspection.noticeDraft = generateImprovementNoticeDraft(inspection);

      const saved = await inspectionRepository.save(inspection);
      res.json({ success: true, data: saved });
    } catch (e: any) {
      console.error('Analysis execution failure:', e);
      const inspection = await inspectionRepository.getById(req.params.id);
      if (inspection) {
        inspection.status = 'failed';
        inspection.errorMessage = e.message || 'Analysis could not be completed';
        await inspectionRepository.save(inspection);
      }
      res.status(500).json({ success: false, error: e.message || 'Compliance analysis failed' });
    }
  });

  // 5. Compare Package with Digital Listing
  app.post('/api/inspections/:id/compare', async (req, res) => {
    try {
      const inspection = await inspectionRepository.getById(req.params.id);
      if (!inspection) {
        return res.status(404).json({ success: false, error: 'Inspection not found' });
      }

      const { listing } = req.body;
      if (!listing) {
        return res.status(400).json({ success: false, error: 'Digital listing details required for comparison' });
      }

      const comparison = comparePackageWithDigitalListing(inspection, listing);
      inspection.comparison = comparison;
      const saved = await inspectionRepository.save(inspection);

      res.json({ success: true, data: saved });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 6. Get Improvement Notice Draft
  app.get('/api/inspections/:id/notice', async (req, res) => {
    try {
      const inspection = await inspectionRepository.getById(req.params.id);
      if (!inspection) {
        return res.status(404).json({ success: false, error: 'Inspection not found' });
      }

      const notice = inspection.noticeDraft || generateImprovementNoticeDraft(inspection);
      res.json({ success: true, data: notice });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 7. Analytics & Risk Intelligence
  app.get('/api/analytics/risk-intelligence', async (req, res) => {
    try {
      const analytics = await inspectionRepository.getRiskIntelligence();
      res.json({ success: true, data: analytics });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // 8. Demo reset / seed
  app.post('/api/demo/seed', async (req, res) => {
    try {
      await inspectionRepository.seedInitialSamples();
      res.json({ success: true, message: 'Seeded reference inspections successfully' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ==========================================
  // VITE / STATIC SERVING
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aletiq compliance server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
