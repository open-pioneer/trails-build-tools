import { register } from 'ol/proj/proj4.js';
import proj4 from 'proj4';

function registerProjections(projections) {
  for (const [name, definition] of Object.entries(projections)) {
    proj4.defs(name, definition);
  }
  register(proj4);
}
function getProjection(name) {
  return proj4.defs(name);
}

export { getProjection, registerProjections };
//# sourceMappingURL=projections.js.map
