# File: backend/diff_c/Makefile
# Author: Milan Vodák <xvodak07@stud.fit.vut.cz>
# Description: Makefile for compiling the difference algorithm.

CC = clang
CFLAGS = -Wall -Wextra -fPIC -O3
LDFLAGS = -shared
SRCS = main.c call_graph.c csv.c edge.c hashtable.c invoke.c map.c method.c
OBJS = $(SRCS:.c=.o)

bin_name = diff
lib_name = libdiff.so
lib_path = ../build

.PHONY: lib clean

$(bin_name): $(OBJS)
	$(CC) $^ -o $@

lib: $(lib_path)/$(lib_name)

$(lib_path)/$(lib_name): $(OBJS)
	mkdir -p $(lib_path)
	$(CC) $(LDFLAGS) $^ -o $(lib_path)/$@

%.o: %.c
	$(CC) -c $(CFLAGS) $< -o $@

clean:
	rm -f $(OBJS) $(bin_name) $(lib_path)/$(lib_name)
