import mongoose, { Schema, Document } from 'mongoose';

export interface IPriceList extends Document {
  vendor: mongoose.Types.ObjectId;
  categories: {
    name: string; // e.g., "Washing & Ironing", "Dry Cleaning"
    items: {
      name: string; // e.g., "Shirt", "Trousers"
      price: number;
    }[];
  }[];
}

const PriceListSchema: Schema = new Schema(
  {
    vendor: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    categories: [
      {
        name: { type: String, required: true },
        items: [
          {
            name: { type: String, required: true },
            price: { type: Number, required: true },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<IPriceList>('PriceList', PriceListSchema);
