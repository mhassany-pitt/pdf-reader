import { ConfigService } from "@nestjs/config";
import mongoose from "mongoose";

export const storageRoot = (config: ConfigService, ...path: string[]) => {
  return config.get('STORAGE') + (path ? '/' + path.join('/') : '');
}

export const toObject = (object) => object.toObject();
export const useId = ({ __v, _id: id, ...attrs }): any => ({ id: id.toString(), ...attrs });
export const use_Id = ({ id: _id, ...attrs }): any => ({ _id: new mongoose.Types.ObjectId(_id), ...attrs });