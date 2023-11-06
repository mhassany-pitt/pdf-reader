import {
  Body, Controller, Delete,
  Get,
  NotFoundException, Param, Patch, Post, Req
} from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { useId } from 'src/utils';

@Controller('preferences')
export class PreferencesController {

  constructor(
    private service: PreferencesService,
  ) { }

  private async _getOrFail({ user_id, key }) {
    const annot = await this.service.read({ user_id, key });
    return annot ? useId(annot) : null;
  }

  @Get(':key')
  async read(@Req() req: any, @Param('key') key: string) {
    const pref = await this._getOrFail({ user_id: req.user.id, key });
    const { value } = pref || { value: null };
    return { value };
  }

  @Patch()
  async update(@Req() req: any, @Body() { key, value }: any) {
    const pref = await this._getOrFail({ user_id: req.user.id, key });
    return pref ? useId(await this.service.update({ user_id: req.user.id, key, value }))
      : useId(await this.service.create({ user_id: req.user.id, key, value }));
  }

  @Delete()
  async delete(@Req() req: any, @Body() { key, value }: any) {
    await this._getOrFail({ user_id: req.user.id, key });
    await this.service.delete({ user_id: req.user.id, key });
  }
}
