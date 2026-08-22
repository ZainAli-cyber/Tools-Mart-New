// Reads tools from adminStore (localStorage) so customer site always sees admin changes
export { loadTools } from '../admin/data/adminStore';
export function nameToId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function blankTool() {
  return { id:'', name:'', category:'SEO', rating:4.9, price:556, originalPrice:2780, discount:80, favicon:'', desc:'', fullDesc:'', features:['Feature 1','Feature 2','Feature 3'], useCases:['Freelancers','Agencies'], faqs:[{q:'Is this genuine?',a:'Yes, 100% verified.'},{q:'How fast?',a:'Within 5 minutes.'}], waText:'', showOnHome:true };
}
export function saveTools() {}
