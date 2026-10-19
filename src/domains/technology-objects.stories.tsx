import type { Meta, StoryObj } from "@storybook/react-vite";
import { TECHNOLOGY_OBJECTS } from "../../registry/domains/technology-object-model";
import type { TechnologyObjectKind } from "../../registry/domains/technology-object-model";
import { TechnologyObject2D } from "../../registry/domains/technology-object-2d";
import { DomainGallery, ThemedStage } from "./domain-gallery";

const STRESS_TOKENS={accent:"#C2416B",accent2:"#3C9AD6",deep:"#5E5873"};
function Gallery(){
  return <DomainGallery heading="Technology objects" entries={TECHNOLOGY_OBJECTS}
    description="Infrastructure, devices, data, security and software-delivery concepts"
    renderItem={(kind,theme)=><TechnologyObject2D spec={{id:"gallery-"+kind,kind:kind as TechnologyObjectKind}}
      theme={theme} width={168} height={140}/>}
    stress={theme=><>
      <TechnologyObject2D theme={theme} width={240} height={200}
        spec={{id:"stress-long",kind:"database",title:"Regional read-replica database cluster"}}/>
      <TechnologyObject2D theme={theme} width={240} height={200}
        spec={{id:"stress-cjk",kind:"ai-model",title:"大規模言語モデルの推論サーバー"}}/>
      <TechnologyObject2D theme={theme} width={240} height={200} tokens={STRESS_TOKENS}
        spec={{id:"stress-tokens",kind:"container",title:"Custom tokens"}}/>
      <TechnologyObject2D theme={theme} width={240} height={200} spec={{id:"stress-active",kind:"cloud",state:"active"}}/>
      <TechnologyObject2D theme={theme} width={240} height={200} spec={{id:"stress-done",kind:"git-branch",state:"complete"}}/>
      <TechnologyObject2D theme={theme} width={96} height={80} showTitle={false} spec={{id:"stress-small",kind:"padlock"}}/>
    </>}/>;
}
interface PlaygroundArgs { kind:TechnologyObjectKind; theme:"midnight"|"paper"; frame:number; reducedMotion:boolean }
function Playground({kind,theme,frame,reducedMotion}:PlaygroundArgs){
  return <ThemedStage theme={theme}>
    <TechnologyObject2D spec={{id:"playground",kind}} theme={theme} frame={frame}
      revealFrames={20} reducedMotion={reducedMotion} width={480} height={400}/>
  </ThemedStage>;
}
const meta={title:"Domains/Technology Objects",component:Playground,parameters:{layout:"centered"},
  argTypes:{kind:{control:"select",options:TECHNOLOGY_OBJECTS.map(o=>o.kind)},
    theme:{control:"inline-radio",options:["midnight","paper"]},
    frame:{control:{type:"range",min:0,max:30,step:1}}},
  args:{kind:"server-rack",theme:"midnight",frame:30,reducedMotion:false},
} satisfies Meta<typeof Playground>;
export default meta;
type Story=StoryObj<typeof meta>;
export const AllObjects:Story={render:()=> <Gallery/>,parameters:{layout:"fullscreen"}};
export const Single:Story={};
