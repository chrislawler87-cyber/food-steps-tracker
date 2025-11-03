const STORAGE_KEY = 'fs_tracker_v1';

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function todayKey(){ return new Date().toISOString().slice(0,10); }

function loadState(){
  try{ const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw) : { days:{}, meals:[] }; }
  catch(e){ return { days:{}, meals:[] }; }
}
function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

function totalsFor(day){
  const t={calories:0,protein:0,carbs:0,fat:0};
  if(!day) return t;
  (day.foods||[]).forEach(f=>{
    t.calories += Number(f.calories||0);
    t.protein += Number(f.protein||0);
    t.carbs   += Number(f.carbs||0);
    t.fat     += Number(f.fat||0);
  });
  return t;
}

let state = loadState();
let dateKey = todayKey();

const els = {
  dateKey: document.getElementById('dateKey'),
  totCal: document.getElementById('totCal'),
  totPro: document.getElementById('totPro'),
  totCarb: document.getElementById('totCarb'),
  totFat: document.getElementById('totFat'),
  steps: document.getElementById('steps'),
  stepsInput: document.getElementById('stepsInput'),
  saveSteps: document.getElementById('saveSteps'),
  foodForm: document.getElementById('foodForm'),
  foodName: document.getElementById('foodName'),
  foodCal: document.getElementById('foodCal'),
  foodPro: document.getElementById('foodPro'),
  foodCarb: document.getElementById('foodCarb'),
  foodFat: document.getElementById('foodFat'),
  barcodeBtn: document.getElementById('barcodeBtn'),
  mealName: document.getElementById('mealName'),
  saveMealBtn: document.getElementById('saveMealBtn'),
  foodsList: document.getElementById('foodsList'),
  mealsList: document.getElementById('mealsList'),
  status: document.getElementById('status')
};

function render(){
  els.dateKey.textContent = dateKey;
  const day = state.days[dateKey] || { foods:[], steps:0 };
  const t = totalsFor(day);
  els.totCal.textContent = Math.round(t.calories);
  els.totPro.textContent = Math.round(t.protein);
  els.totCarb.textContent = Math.round(t.carbs);
  els.totFat.textContent = Math.round(t.fat);
  els.steps.textContent = day.steps || 0;
  els.stepsInput.value = day.steps || 0;

  els.foodsList.innerHTML = '';
  (day.foods||[]).forEach(f => {
    const row = document.createElement('div');
    row.className = 'food-row';
    row.innerHTML = `<div><strong>${f.name}</strong> — ${Math.round(f.calories)} kcal (${Math.round(f.protein)}p/${Math.round(f.carbs)}c/${Math.round(f.fat)}f)</div>
                     <div><button data-id="${f.id}">Remove</button></div>`;
    row.querySelector('button').addEventListener('click', () => removeFood(f.id));
    els.foodsList.appendChild(row);
  });

  els.mealsList.innerHTML = '';
  state.meals.forEach(m => {
    const item = document.createElement('div');
    item.style.marginBottom = '8px';
    item.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
                        <strong>${m.name}</strong>
                        <div><button data-id="${m.id}">Add</button></div>
                      </div>
                      <small class="muted">${m.items.length} items</small>`;
    item.querySelector('button').addEventListener('click', () => addMealToToday(m.id));
    els.mealsList.appendChild(item);
  });
}

function ensureDay(){
  if(!state.days[dateKey]) state.days[dateKey] = { foods:[], steps:0 };
  return state.days[dateKey];
}

function addFood(food){
  const day = ensureDay();
  day.foods.push({ id: uid(), ...food });
  saveState(state);
  els.status.textContent = 'Added';
  render();
}

function removeFood(id){
  const day = ensureDay();
  day.foods = day.foods.filter(f => f.id !== id);
  saveState(state);
  render();
}

function updateSteps(val){
  const day = ensureDay();
  day.steps = Number(val)||0;
  saveState(state);
  render();
}

function saveMeal(name, items){
  if(!name) return;
  const meal = { id: uid(), name, items };
  state.meals.unshift(meal);
  saveState(state);
  els.status.textContent = 'Meal saved';
  render();
}

function addMealToToday(mealId){
  const meal = state.meals.find(m => m.id === mealId);
  if(!meal) return;
  const day = ensureDay();
  meal.items.forEach(it => day.foods.push({ id: uid(), ...it }));
  saveState(state); render();
}

async function lookupBarcode(code){
  els.status.textContent = 'Looking up...';
  try{
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    if(!res.ok) throw new Error('lookup failed');
    const j = await res.json();
    if(j.status===1){
      const p = j.product, n = p.nutriments || {};
      const food = {
        name: p.product_name || p.generic_name || 'Scanned product',
        calories: n['energy-kcal_100g'] || n['energy-kcal_serving'] || 0,
        protein:  n['proteins_100g'] || n['proteins_serving'] || 0,
        carbs:    n['carbohydrates_100g'] || n['carbohydrates_serving'] || 0,
        fat:      n['fat_100g'] || n['fat_serving'] || 0
      };
      document.getElementById('foodName').value = food.name;
      document.getElementById('foodCal').value = food.calories||0;
      document.getElementById('foodPro').value = food.protein||0;
      document.getElementById('foodCarb').value = food.carbs||0;
      document.getElementById('foodFat').value = food.fat||0;
      els.status.textContent = 'Found product — edit if needed and press Add';
    } else {
      els.status.textContent = 'Not found — enter details manually';
    }
  }catch(e){
    els.status.textContent = 'Lookup failed (offline?) — enter manually';
  }
}

els.saveSteps.addEventListener('click', () => updateSteps(els.stepsInput.value));
els.foodForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const food = {
    name: els.foodName.value.trim(),
    calories: Number(els.foodCal.value||0),
    protein: Number(els.foodPro.value||0),
    carbs: Number(els.foodCarb.value||0),
    fat: Number(els.foodFat.value||0)
  };
  if(!food.name) return;
  addFood(food);
  els.foodName.value=''; els.foodCal.value=''; els.foodPro.value=''; els.foodCarb.value=''; els.foodFat.value='';
});
els.saveMealBtn.addEventListener('click', () => {
  const nm = (els.mealName.value||'').trim();
  if(!nm) { alert('Give the meal a name'); return; }
  const item = {
    name: els.foodName.value || 'Meal item',
    calories: Number(els.foodCal.value||0),
    protein: Number(els.foodPro.value||0),
    carbs: Number(els.foodCarb.value||0),
    fat: Number(els.foodFat.value||0)
  };
  saveMeal(nm, [item]);
  els.mealName.value='';
});
els.barcodeBtn.addEventListener('click', () => {
  const code = prompt('Enter barcode number');
  if(code) lookupBarcode(code);
});

render();