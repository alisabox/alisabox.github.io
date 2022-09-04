import { EventEmitter, Injectable } from '@angular/core';
import { FirebaseApp } from '@angular/fire/app';
import { Database, getDatabase, ref, get, query, set, update, child, push, onValue, remove } from '@angular/fire/database';
import { Router } from '@angular/router';
import { EMPTY, from, Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ToDo } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private _db: Database;
  public dataRef$: EventEmitter<any> = new EventEmitter()

  constructor(
    private readonly _firebase: FirebaseApp,
    private router: Router
  ) {
    this._db = getDatabase(this._firebase);
  }

  public subscribeToDataChanges(id: any): void {
    onValue(ref(this._db, `users/${id}`), (snapshot) => {
      this.dataRef$.emit(snapshot.val());
    });
  }

  public fetchDataById(id: any): Observable<any> {
    const dataRef$ = get(ref(this._db, `users/${id}`)).then((snapshot) => {
      if (snapshot.exists()) {
        return snapshot.val();
      } else {
        this.router.navigate([`not-found`]);
        throw Error();
      }
    }).catch(() => {
      return EMPTY;
    });

    this.subscribeToDataChanges(id);

    return from(dataRef$);
  }

  public createNewId(): any {
    const userId = uuidv4();
    set(ref(this._db, 'users/' + userId), {
      [userId]: 'placeholder',
    });

    return userId;
  }

  public replaceById(userId: string, todo: ToDo): void {
    set(ref(this._db, `users/${userId}/${todo.id}`), todo);
  }

  public addToDo(userId: string, todo: ToDo): void {
    const newToDoKey = push(child(ref(this._db), `users/${userId}`)).key;
    todo.id = newToDoKey ?? todo.id;
    const updates = {
      [`users/${userId}/${newToDoKey}`]: todo,
    };
    update(ref(this._db), updates);
  }

  public deleteToDo(userId: string, toDoKey: string): void {
    remove(ref(this._db, `users/${userId}/${toDoKey}`));
  }
}
