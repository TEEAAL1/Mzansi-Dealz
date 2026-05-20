import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import categoriesRouter from "./categories";
import checkoutRouter from "./checkout";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(categoriesRouter);
router.use(checkoutRouter);

export default router;
