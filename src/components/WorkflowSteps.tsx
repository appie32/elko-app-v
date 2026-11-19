'use client'

import { WORKFLOW, workflowStage } from '@/lib/workflow'

export default function WorkflowSteps({ status }: { status: string }) {
  const active = workflowStage(status)
  return (
    <div style={{marginTop:14, marginBottom:16}}>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}} aria-label={`Projectfase: ${status}`}>
        {WORKFLOW.map((step,index)=><div key={step.label} style={{
          flex:'1 1 105px',padding:'11px 9px',borderRadius:10,
          border:`1px solid ${index===active?'#B89B5E':'#dedbd4'}`,
          background:index===active?'#F5EFE4':index<active?'#edf1ed':'#fafafa'
        }}>
          <div style={{fontSize:12,fontWeight:700,color:index<=active?'#1e3445':'#707070'}}>
            {index<active?'✓ ':''}{index+1}. {step.label}
          </div>
          <div style={{fontSize:10,marginTop:4,color:'#6c6c6c'}}>{step.description}</div>
        </div>)}
      </div>
      {status==='Geannuleerd'&&<p role="status">Dit project is geannuleerd.</p>}
    </div>
  )
}
