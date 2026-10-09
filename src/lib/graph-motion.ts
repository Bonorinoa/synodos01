/** Critically damped settling: gravity-like arrival without bouncing labels. */
export const MOTION_MS = 420;
export function settleProgress(progress:number) {
  if(progress>=1)return 1;if(progress<=0)return 0;
  const response=(t:number)=>1-(1+8*t)*Math.exp(-8*t);
  return response(progress)/response(1);
}
