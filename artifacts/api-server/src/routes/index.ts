import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import checkoutRouter from "./checkout";
import adminRouter from "./admin";
import uploadsRouter from "./uploads";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(checkoutRouter);
router.use(adminRouter);
router.use(uploadsRouter);

export default router;
