import { describe,it,expect } from 'vitest';
import { groundFindings, type ResearchSource } from '@/lib/research';
import { settleProgress } from '@/lib/graph-motion';
import { ingestFindings,parseFindings,createArtifact } from '@/lib/ingest';
const date='2026-10-09';
const excerpt='Ada Lovelace and Charles Babbage coauthored the publication on analytical engines.';
const source:ResearchSource={url:'https://university.example/paper',title:'Publication',markdown:excerpt,status:200,retrieved_at:date};
const finding={from:'Ada Lovelace',to:'Charles Babbage',basis:'coauthorship',claim:'Coauthored the publication.',sources:[{index:0,excerpt}]};
describe('Source grounding',()=>{
  it('keeps fetched quotes dated and low-confidence until owner review',()=>{
    const result=groundFindings({findings:[finding]},[source],['Ada Lovelace'],date);
    const {artifact}=ingestFindings(createArtifact('Test','Owner'),parseFindings(JSON.stringify(result.file),'research.json'),'research.json');
    expect(artifact.edges[0]?.evidence).toMatchObject({confidence:'low',review_status:'pending',source_checks:[{accessible:true,status:200,checked_at:date}]});
    expect(artifact.edges[0]?.evidence.provenance?.[0]?.excerpt).toBe(excerpt);
  });
  it('drops invented quotes, missing names, unknown indexes and inaccessible pages',()=>{
    for(const sources of [[{index:0,excerpt:'Invented evidence of a scholarly relationship.'}],[{index:9,excerpt}],[{index:0,excerpt:'Ada Lovelace is an author of analytical engines.'}]]){
      expect(groundFindings({findings:[{...finding,sources}]},[source],['Ada Lovelace'],date).file.findings).toHaveLength(0);
    }
    expect(groundFindings({findings:[finding]},[{...source,status:403}],['Ada Lovelace'],date).file.findings).toHaveLength(0);
  });
  it('never combines differing discovered claims',()=>{
    const file=groundFindings({findings:[finding,{...finding,claim:'A different publication claim.'}]},[source],['Ada Lovelace'],date).file;
    expect(ingestFindings(createArtifact('Test','Owner'),parseFindings(JSON.stringify(file),'r.json'),'r.json').artifact.edges).toHaveLength(2);
  });
});
describe('Gravity-like settling',()=>{
  it('has stable endpoints and no backwards motion or overshoot',()=>{
    const values=Array.from({length:101},(_,i)=>settleProgress(i/100));
    expect(values[0]).toBe(0);expect(values.at(-1)).toBe(1);
    values.forEach((value,i)=>{expect(value).toBeGreaterThanOrEqual(values[i-1]??0);expect(value).toBeLessThanOrEqual(1);});
  });
});