import { describe, expect, it } from 'vitest';
import { hopContours, verticalTrailPositions } from '@/lib/cartography';

describe('Hop cartography presentation',()=>{
  it('draws closed nested superlevel contours from recorded hop geometry',()=>{
    const rings=hopContours([{id:'ego',x:0,y:0,depth:0},{id:'direct',x:200,y:0,depth:1},{id:'bridge',x:400,y:80,depth:2}]);
    expect(rings.map(r=>r.depth)).toEqual([0,1,2]);
    for(const ring of rings){expect(ring.path.startsWith('M ')).toBe(true);expect(ring.path.endsWith(' Z')).toBe(true);expect(ring.path).not.toContain('NaN');}
    expect(rings[0]?.members).toEqual(['ego','direct','bridge']);expect(rings[2]?.members).toEqual(['bridge']);
  });
  it('keeps narrow trail waypoints vertical without changing graph distances',()=>{
    const depths=new Map([['augusto',0],['contact',1],['bridge',2]]);
    const positions=verticalTrailPositions(['augusto','contact','bridge','goal'],['goal','other-goal'],depths,new Map());
    expect(positions.get('augusto')).toEqual({x:0,y:0});expect(positions.get('contact')).toEqual({x:0,y:104});expect(positions.get('goal')).toEqual({x:0,y:312});expect(positions.has('other-goal')).toBe(true);expect(depths.get('bridge')).toBe(2);
  });
});