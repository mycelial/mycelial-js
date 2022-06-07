use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use mycelial_crdt::list;
use mycelial_crdt::vclock;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(_: &str);
}

#[wasm_bindgen]
pub struct List(list::List);

#[derive(Debug, Serialize, Deserialize)]
pub enum ListError {
    /// Wraps original ListError
    ListError(list::ListError),

    /// Bad value from JS which could not be represented as a list::Value
    ValueError(String),

    /// Bad VClock passed to `diff` func
    VClockError(),

    /// Bad diff passed to `apply` func
    DiffError(),
}

impl std::fmt::Display for ListError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            ListError::ListError(e) => write!(f, "{:?}", e),
            ListError::ValueError(e) => write!(f, "ValueError: {:?}", e),
            ListError::VClockError() => write!(f, "VClockError: vclock should be json string"),
            ListError::DiffError() => write!(f, "DiffError: diff should be json string"),
        }
    }
}
impl std::error::Error for ListError {}

fn jsvalue_to_value(value: &JsValue) -> Result<list::Value, ListError> {
    if let Some(s) = value.as_string() {
        return Ok(list::Value::Str(s));
    }
    if let Some(f) = value.as_f64() {
        return Ok(list::Value::Float(f));
    }
    if let Some(b) = value.as_bool() {
        return Ok(list::Value::Bool(b));
    }

    // it's important to check whether the value is a *real* array
    // otherwise aliasing rules are broken, it's not clear why yet
    // broken aliasing rules makes list unusable
    // FIXME: find why it's happening
    // to replicate - remove this check, try to insert undefined
    if js_sys::Array::is_array(value) {
        if let Ok(arr) = TryInto::<js_sys::Array>::try_into(value.clone()) {
            let mut vec = vec![];
            for val in arr.iter() {
                vec.push(jsvalue_to_value(&val)?)
            }
            return Ok(list::Value::Vec(vec));
        }
    }
    Err(ListError::ValueError(format!(
        "unsupported value of type '{}': {:?}",
        value.js_typeof().as_string().unwrap(),
        value
    )))
}

fn value_to_jsvalue(value: &list::Value) -> Result<JsValue, ListError> {
    match value {
        list::Value::Str(s) => Ok(s.into()),
        list::Value::Bool(b) => Ok((*b).into()),
        list::Value::Float(f) => Ok((*f).into()),
        list::Value::Vec(v) => {
            let vec = v
                .iter()
                .map(value_to_jsvalue)
                .collect::<Result<Vec<JsValue>, ListError>>()?;
            Ok(js_sys::Array::from_iter(vec.into_iter()).into())
        }
        list::Value::Empty | list::Value::Tombstone(_) => {
            // Empty && Tombstone values are unreachable, `to_vec` operation filters them out
            unreachable!()
        }
        other => Err(ListError::ValueError(format!("unsupported: {:?}", other))),
    }
}

#[wasm_bindgen]
impl List {
    /// Create new instance of a List CRDT
    // FIXME: process should be u64
    // u64 supported only as a BigInt (why? bigint is unsized)
    // not clear how to add autocast from f64 to BigInt on JS side
    // switch to f64?
    pub fn new(process: usize) -> Self {
        Self(list::List::new(process as u64))
    }

    /// Set hook, which will be invoked on local list update
    pub fn set_on_update(&mut self, func: &js_sys::Function) {
        let func = func.clone();
        let closure: Box<dyn Fn(&list::Op) + 'static> = Box::new(move |ops: &list::Op| {
            if let Ok(s) = serde_json::to_string(&[ops]) {
                func.call1(&JsValue::null(), &JsValue::from(s)).ok();
            }
        });
        self.0.set_on_update(closure);
    }

    /// Remove on update hook
    pub fn unset_on_update(&mut self) {
        self.0.unset_on_update()
    }

    /// Set hook, which will be invoked on remote update (apply)
    pub fn set_on_apply(&mut self, func: &js_sys::Function) {
        let func = func.clone();
        let closure: Box<dyn Fn() + 'static> = Box::new(move || {
            func.call0(&JsValue::null()).ok();
        });
        self.0.set_on_apply(closure);
    }

    /// Unset on apply hook
    pub fn unset_on_apply(&mut self) {
        self.0.unset_on_apply()
    }

    /// Append value to the end of the list
    pub fn append(&mut self, val: &JsValue) -> Result<(), JsError> {
        Ok(self.0.append(jsvalue_to_value(val)?)?)
    }

    /// Insert value at head of the list
    pub fn prepend(&mut self, val: &JsValue) -> Result<(), JsError> {
        Ok(self.0.prepend(jsvalue_to_value(val)?)?)
    }

    /// Insert values at given index
    pub fn insert(&mut self, index: usize, val: &JsValue) -> Result<(), JsError> {
        Ok(self.0.insert(index, jsvalue_to_value(val)?)?)
    }

    /// Delete value at given index
    pub fn delete(&mut self, index: usize) -> Result<(), JsError> {
        Ok(self.0.delete(index)?)
    }

    /// Dump stored values into vector
    pub fn to_vec(&self) -> Result<JsValue, JsError> {
        let arr = js_sys::Array::new();
        for value in self.0.iter() {
            arr.push(&value_to_jsvalue(value)?);
        }
        Ok(arr.into())
    }

    /// Encode inner vclock into JSON
    pub fn vclock(&self) -> JsValue {
        serde_json::to_string(self.0.vclock()).unwrap().into()
    }

    /// Calculate diff and encode into JSON
    ///
    /// Passed value is expected to be JSON serialized VClock
    pub fn diff(&self, value: &JsValue) -> Result<JsValue, JsError> {
        let value = match value.as_string() {
            Some(s) => s,
            None => return Err(ListError::VClockError().into()),
        };
        let vclock = match serde_json::from_str::<vclock::VClock>(&value) {
            Ok(vclock) => vclock,
            Err(_) => return Err(ListError::VClockError().into()),
        };
        let diff = self.0.diff(&vclock);
        Ok(serde_json::to_string(&diff).unwrap().into())
    }

    /// Apply Diff
    ///
    /// Passed diff expected to be JSON serialized vector of Operations
    pub fn apply(&mut self, diff: &JsValue) -> Result<(), JsError> {
        let s = match diff.as_string() {
            Some(s) => s,
            None => return Err(ListError::DiffError().into()),
        };
        let diff: Vec<list::Op> = match serde_json::from_str(&s) {
            Ok(encoded) => encoded,
            // fIXME:
            Err(_) => return Err(ListError::DiffError().into()),
        };
        Ok(self.0.apply(&diff)?)
    }

    /// Dump CRDT into serialized JSON
    pub fn dump(&self) -> Result<JsValue, JsError> {
        serde_json::to_string(&self.0.diff(&vclock::VClock::new()))
            .map(|s| s.into())
            .map_err(|_e| ListError::DiffError().into())
    }
}

#[wasm_bindgen(start)]
pub fn init() {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
}
