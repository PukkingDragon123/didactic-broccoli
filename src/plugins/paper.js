// The paper look for the HUD (src/ui/paper.js + paper.css). Loaded with the plugins, so the textures and the
// stylesheet are in place before the first frame of play.
import '../ui/paper.css';
import { installPaper } from '../ui/paper.js';

installPaper();
export function install() {}
