/* eslint key-spacing: 0 */
/* eslint no-multi-spaces: 0 */

/*
|   Name  | Homeable | HomeableMandatory | Resetable |
|---------|----------|-------------------|-----------|
| Base    | no       | no                | yes       |
| Spindle | yes      | yes               | yes       |
| Arm     | yes      | no                | yes       |
| Head    | no       | no                | no        |
*/

// transform the array of bools to an object
const propertiesTable = {
  /* eslint camelcase:0 */
  // Name     | Homeable |  HomeableMandatory | Resetable
  all:        [true,        false,              false],
  base:       [false,       false,              true],
  spindle:    [true,        true,               true],
  left_arm:   [true,        false,              true],
  right_arm:  [true,        false,              true],
  head:       [false,       false,              false],
};

const properties = {};
for (const name of Object.keys(propertiesTable)) {
  const v = propertiesTable[name];
  properties[name] = {
    homeable: v[0],
    homeable_mandatory: v[1],
    resetable: v[2],
  };
}

export default properties;
