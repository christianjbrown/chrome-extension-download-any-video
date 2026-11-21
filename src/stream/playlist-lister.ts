import type { FormatChoice, StreamLister } from "./playlists";

// Hands the address to the lister for its format.
export class PlaylistLister implements StreamLister {
  constructor(private readonly listers: FormatChoice<StreamLister>) {}

  async references(url: string): Promise<string[]> {
    return this.listers.handlerFor(url).references(url);
  }
}
