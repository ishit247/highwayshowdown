// Car data only: body shape numbers per style, and the five playable cars.
export const STYLES = {
  // kind drives the per-car details; hf = hood length share, nd = nose drop, rc = roof camber, wr = wheel radius
  hatch : {kind:"hatch",  len:4.2, wid:1.78, bodyH:.66, ch:.52, cl:.62, off:-.11,  tsx:.86, fi:1.1, ri:.55, hf:.30, nd:.02, rc:.05, wr:.34, rim:0xc9ccd1},
  sedan : {kind:"sedan",  len:4.8, wid:1.82, bodyH:.64, ch:.50, cl:.62, off:-.11,  tsx:.85, fi:1.2, ri:1.5, hf:.30, nd:.03, rc:.06, wr:.35, rim:0xb9bdc4},
  muscle: {kind:"muscle", len:4.9, wid:1.95, bodyH:.72, ch:.46, cl:.56, off:-.12,  tsx:.84, fi:1.1, ri:1.25,hf:.34, nd:.04, rc:.05, wr:.37, rim:0x2a2c31},
  coupe : {kind:"coupe",  len:4.4, wid:1.85, bodyH:.66, ch:.50, cl:.72, off:-.12,  tsx:.80, fi:.8,  ri:1.9, hf:.27, nd:.14, rc:.07, wr:.35, rim:0xc4c7cc},
  super : {kind:"super",  len:4.6, wid:2.00, bodyH:.56, ch:.40, cl:.42, off:-.01,  tsx:.78, fi:.9,  ri:1.1, hf:.30, nd:.02, rc:.04,   wr:.37, rim:0xcfd3d8, nf:.78},
};
export const CARS = [
  {name:"Compact Hatch", desc:"Light and easy to drive. Great for learning.", color:0xf0f0f0, style:"hatch",
   topKmh:175, accel:3.8, grip:9.2,  mass:1100, cyl:4, redline:6.5, gauge:{type:"analog",unit:"km/h",max:220,step:20}},
  {name:"Family Sedan",  desc:"Comfortable, stable and quick enough.", color:0x9a9788, style:"sedan",
   topKmh:215, accel:4.2, grip:9.8,  mass:1500, cyl:4, redline:6.2, gauge:{type:"analog",unit:"km/h",max:260,step:20}},
  {name:"Muscle GT",     desc:"Big V8 thunder. Fast in a line, heavy in corners.", color:0xf2f4f7, style:"muscle", stripes:true,
   topKmh:255, accel:6.2, grip:9.0,  mass:1750, cyl:8, redline:6.0, gauge:{type:"analog",unit:"mph",max:180,step:20}},
  {name:"Sports Coupe",  desc:"Sharp handling with a digital cluster (mph).", color:0x1b1c21, style:"coupe",
   topKmh:282, accel:6.8, grip:11.5, mass:1350, cyl:6, redline:7.5, gauge:{type:"digital",unit:"mph"}},
  {name:"Hypercar",      desc:"Brutal speed and grip. Digital cluster (km/h).", color:0x5a7fa8, style:"super",
   topKmh:335, accel:9.0, grip:13.5, mass:1400, cyl:8, redline:8.8, gauge:{type:"digital",unit:"km/h"}},
];
CARS.forEach(c => Object.assign(c, STYLES[c.style]));
