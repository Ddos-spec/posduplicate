import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import {
  archiveDocumentById,
  cancelSignatureRequestById,
  declinePublicSignature,
  downloadDocumentVersion,
  downloadPublicSignatureDocument,
  getDocumentById,
  getDocuments,
  getFolders,
  getKnowledgeArticleById,
  getKnowledgeArticles,
  getKnowledgeSpaces,
  getPublicSignature,
  getSignatureRequests,
  patchKnowledgeStatus,
  postDocument,
  postDocumentAccess,
  postDocumentVersion,
  postFolder,
  postKnowledgeArticle,
  postKnowledgeRevision,
  postKnowledgeSpace,
  postSignatureRequest,
  signPublicSignature,
} from '../controllers/productivity.p3.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024, files: 1 } });
const signWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'PUBLIC_SIGN_RATE_LIMITED', message: 'Too many signature attempts. Please try again later.' } },
});

// Public signing is token-scoped. Keep these endpoints before authentication middleware.
router.get('/sign/public/:token', getPublicSignature);
router.get('/sign/public/:token/document', downloadPublicSignatureDocument);
router.post('/sign/public/:token/sign', signWriteLimiter, signPublicSignature);
router.post('/sign/public/:token/decline', signWriteLimiter, declinePublicSignature);

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get('/documents/folders', requireCapability('productivity.documents.read'), getFolders);
router.post('/documents/folders', requireCapability('productivity.documents.manage'), postFolder);
router.get('/documents', requireCapability('productivity.documents.read'), getDocuments);
router.post('/documents', requireCapability('productivity.documents.manage'), upload.single('file'), postDocument);
router.get('/documents/:id', requireCapability('productivity.documents.read'), getDocumentById);
router.post('/documents/:id/versions', requireCapability('productivity.documents.manage'), upload.single('file'), postDocumentVersion);
router.get('/documents/:id/versions/:version/download', requireCapability('productivity.documents.read'), downloadDocumentVersion);
router.post('/documents/:id/access', requireCapability('productivity.documents.manage'), postDocumentAccess);
router.patch('/documents/:id/archive', requireCapability('productivity.documents.manage'), archiveDocumentById);

router.get('/knowledge/spaces', requireCapability('productivity.knowledge.read'), getKnowledgeSpaces);
router.post('/knowledge/spaces', requireCapability('productivity.knowledge.manage'), postKnowledgeSpace);
router.get('/knowledge/articles', requireCapability('productivity.knowledge.read'), getKnowledgeArticles);
router.get('/knowledge/articles/:id', requireCapability('productivity.knowledge.read'), getKnowledgeArticleById);
router.post('/knowledge/articles', requireCapability('productivity.knowledge.manage'), postKnowledgeArticle);
router.post('/knowledge/articles/:id/revisions', requireCapability('productivity.knowledge.manage'), postKnowledgeRevision);
router.patch('/knowledge/articles/:id/status', requireCapability('productivity.knowledge.manage'), patchKnowledgeStatus);

router.get('/sign/requests', requireCapability('productivity.sign.read'), getSignatureRequests);
router.post('/sign/requests', requireCapability('productivity.sign.manage'), postSignatureRequest);
router.patch('/sign/requests/:id/cancel', requireCapability('productivity.sign.manage'), cancelSignatureRequestById);

export default router;
