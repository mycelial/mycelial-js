use wasm_bindgen::prelude::*;
use js_sys;

use mycelial_crdt::list;
use mycelial_crdt::vclock;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace=console)]
    fn log(_: &str);
}

#[wasm_bindgen]
pub struct List(list::List);

#[derive(Debug)]
struct Value(list::Value);


#[derive(Debug)]
pub enum ValueError {
    ListError(list::ListError),
    JsValueError,
}


impl From<list::ListError> for ValueError {
    fn from(e: list::ListError) -> Self {
        Self::ListError(e)
    }
}


impl From<ValueError> for JsValue {
    fn from(e: ValueError) -> Self {
        // FIXME: this is terrible
        match e {
            ValueError::JsValueError => JsValue::from(""),
            ValueError::ListError(e) => JsValue::from(&format!("{:?}", e)),
        }
    }
}

impl TryFrom<&JsValue> for Value {
    type Error = ValueError;

    fn try_from(jsv: &JsValue) -> Result<Self, Self::Error> {
        match jsv {
            v if v.is_string() => {
                Ok(Value(list::Value::Str(v.as_string().unwrap())))
            },
            v if v.is_object() => {
                let vec = match TryInto::<js_sys::Array>::try_into(jsv.clone()) {
                    Ok(arr) => {
                        arr.iter()
                            .map(|ref val| { Ok(Value::try_from(val)?.0) })
                            .collect::<Result<Vec<list::Value>, ValueError>>()?
                    },
                    Err(_) => return Err(ValueError::JsValueError),
                };
                Ok(Self(list::Value::Vec(vec)))
            },
            _ => Err(ValueError::JsValueError),
        }
    }
}

#[wasm_bindgen]
impl List {
    pub fn new(process: usize) -> Self {
        Self( list::List::new(process as u64) )
    }

    pub fn append(&mut self, val: &JsValue) -> Result<(), JsValue> {
        self.0.append( Self::to_value(val)? ).map_err(|e| ValueError::from(e).into())
    }

    pub fn set_on_update(&mut self, func: &js_sys::Function) {
        let func = func.clone();
        let closure: Box<dyn Fn(&list::Op) + 'static> = Box::new(move |ops: &list::Op| {
            match serde_json::to_string(&[ops]) {
                Ok(s) => { func.call1(&JsValue::null(), &JsValue::from(s)).ok(); }
                Err(_) => (),
            }
        });
        self.0.set_on_update(closure);
    }

    pub fn unset_on_update(&mut self) {
        self.0.unset_on_update()
    }

    pub fn insert(&mut self, index: usize, val: &JsValue) -> Result<(), JsValue> {
        self.0.insert(index, Self::to_value(val)? ).map_err(|e| ValueError::from(e).into())
    }

    pub fn delete(&mut self, index: usize) {
        self.0.delete(index)
    }

    pub fn to_vec(&self) -> js_sys::Array {
        js_sys::Array::from_iter(self.0.to_vec().into_iter().map(Self::to_jsvalue))
    }

    pub fn vclock(&self) -> JsValue {
        serde_json::to_string(self.0.vclock()).unwrap().into()
    }

    pub fn diff(&self, value: &JsValue) -> Result<JsValue, JsValue> {
        let vclock: vclock::VClock = match value.is_string() {
            true => serde_json::from_str(&value.as_string().unwrap()).map_err(|_| ValueError::JsValueError)?,
            false => return Err(ValueError::JsValueError.into()),
        };
        let diff = self.0.diff(&vclock);
        Ok(serde_json::to_string(&diff).map_err(|_| ValueError::JsValueError)?.into())
    }

    pub fn apply(&mut self, diff: &JsValue) -> Result<(), JsValue> {
        let s = match diff.is_string() {
            true => diff.as_string().unwrap(),
            false => return Err(ValueError::JsValueError.into()),
        };
        let diff: Vec<list::Op> = serde_json::from_str(&s)
            .map_err(|_| ValueError::JsValueError)?;
        self.0.apply(&diff).map_err(|e| ValueError::ListError(e).into())
    }

    fn to_value(val: &JsValue) -> Result<list::Value, JsValue> {
        match Value::try_from(val) {
            Ok(v) => Ok(v.0),
            Err(e) => Err(e.into()),
        }
    }

    fn to_jsvalue(val: &list::Value) -> JsValue {
        match val {
            list::Value::Str(s) => JsValue::from(s),
            list::Value::Vec(v) => {
                js_sys::Array::from_iter(v.into_iter().map(Self::to_jsvalue)).into()
            },
            list::Value::Empty | list::Value::Tombstone(_) => {
                // Empty && Tombstone values are unreachable, `to_vec` operation filters them out
                unreachable!()
            }
        }
    }
}
