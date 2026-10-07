import {describe,it,expect,vi} from 'vitest';
import {issueFeedbackToken,verifyFeedbackToken,feedbackFallback} from '@/lib/ai/feedback';
describe('feedback confirmation',()=>{
 it('binds confirmation to the client, milestone, delivery and exact request',()=>{
  const token=issueFeedbackToken('client','milestone','verdict','Change the existing heading to dark green');
  expect(()=>verifyFeedbackToken(token,'client','milestone','verdict','Change the existing heading to dark green')).not.toThrow();
  for(const args of [['other','milestone','verdict','Change the existing heading to dark green'],['client','other','verdict','Change the existing heading to dark green'],['client','milestone','new-verdict','Change the existing heading to dark green'],['client','milestone','verdict','Add a website']]) expect(()=>verifyFeedbackToken(token,...args as [string,string,string,string])).toThrow(/changed/);
  expect(()=>verifyFeedbackToken(token+'x','client','milestone','verdict','x')).toThrow();
 });
 it('expires without allowing replay on a later delivery',()=>{
  vi.useFakeTimers();try{const token=issueFeedbackToken('c','m','v','request');vi.advanceTimersByTime(31*60_000);expect(()=>verifyFeedbackToken(token,'c','m','v','request')).toThrow(/changed/)}finally{vi.useRealTimers()}
 });
 it('never approves offline ambiguity and flags explicit extra work',()=>{
  expect(feedbackFallback('Make it warmer').status).toBe('clarify');
  expect(feedbackFallback('Add an extra landing page').status).toBe('scope_change');
  expect(feedbackFallback('Use cream in the hero. No extra work or deadline changes').status).not.toBe('scope_change');
  expect(feedbackFallback('Change heading color to green').status).toBe('clarify');
 });
});
