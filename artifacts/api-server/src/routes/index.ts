import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import checkoutRouter from "./checkout";
import adminRouter from "./admin";
import uploadsRouter from "./uploads";
import productImportRouter from "./product-import";
import seoRouter from "./seo";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(checkoutRouter);
router.use(adminRouter);
router.use(uploadsRouter);
router.use(productImportRouter);
router.use(seoRouter);

export default router;
