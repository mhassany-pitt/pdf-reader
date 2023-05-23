import { ConfigService } from "@nestjs/config";

export const storageRoot = (config: ConfigService, ...path: string[]) => {
  return config.get('STORAGE') + (path ? '/' + path.join('/') : '');
}

export const toObject = (object) => object.toObject();
export const useId = ({ __v, _id: id, ...attrs }) => ({ id, ...attrs });
export const use_Id = ({ id: _id, ...attrs }) => ({ _id, ...attrs });