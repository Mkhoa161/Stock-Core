import { Request, Response, NextFunction } from 'express';
import { items, Item } from '../models/item';

// Read all items
export const getItems = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(items);
  } catch (error) {
    next(error);
  }
};